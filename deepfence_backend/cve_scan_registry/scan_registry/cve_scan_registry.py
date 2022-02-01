import boto3
from botocore.exceptions import ClientError, EndpointConnectionError
from subprocess import Popen, PIPE
import json
import base64
from datetime import datetime, timedelta
from urllib.parse import urlparse
import requests
from dateutil.tz import tzlocal
import urllib3
import os
import logging
import shutil
from requests.exceptions import HTTPError, ConnectionError, MissingSchema
from botocore.credentials import InstanceMetadataProvider, InstanceMetadataFetcher

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

docker_config_path_prefix = "/tmp/docker_config_"
REGISTRY_TYPE_ECR = "ecr"
REGISTRY_TYPE_DOCKER_HUB = "docker_hub"
REGISTRY_TYPE_QUAY = "quay"
REGISTRY_TYPE_DOCKER_PVT = "docker_private_registry"
REGISTRY_TYPE_HARBOR = "harbor"
REGISTRY_TYPE_JFROG = "jfrog_container_registry"
REGISTRY_TYPE_GCLOUD = "google_container_registry"
REGISTRY_TYPE_AZURE = "azure_container_registry"
REGISTRY_TYPE_GITLAB = "gitlab"
config_json = "config.json"
max_days = 3650
audit_file = "/root/entrypoint.sh"
certs_dir = "/etc/docker/certs.d/"


def bytes_to_str(bytes, to, bsize=1000):
    a = {'k': 1, 'm': 2, 'g': 3}
    b = {'k': "KB", 'm': "MB", 'g': "GB"}
    return "{0:.2f} {1}".format(float(bytes) / (bsize ** a[to]), b[to])


class DFError(Exception):
    def __init__(self, message, code=None, error=None):
        self.message = message
        self.code = code
        self.error = error
        msg = "DFError: {}".format(message)
        if code:
            msg = "DFError: {}:{}".format(message, code)
        elif error:
            msg = "DFError: {} => {}".format(message, error)
        elif code and error:
            msg = "DFError: {}:{} => {}".format(message, code, error)
        super(DFError, self).__init__(msg)


def mkdir_recursive(path):
    os.makedirs(path, exist_ok=True)


def get_tmp_path(scan_id):
    return "/data/cve-scan-upload/registry_scan/" + scan_id.replace("/", "_").replace(":", "_").replace(".", "_")


def divide_chunks(l, n):
    # looping till length l
    for i in range(0, len(l), n):
        yield l[i:i + n]


class CveScanRegistryImages:
    def __init__(self):
        self.registry_type = ""
        self.docker_config_path = ""
        self.docker_config_file = ""
        self.scan_type = "base,java,python,ruby,php,nodejs,js,dotnet"
        self.scan_id = ""
        self.deepfence_key = ""
        self.mgmt_console_url = "127.0.0.1:443"
        self.docker_registry_name = ""
        self.client_cert_file_name = ""
        self.client_key_file_name = ""
        self.ca_cert_file_name = ""
        self.image_layer_tar_dir = ""
        self.update_dependency_data = "true"
        self.is_image_local = "false"
        self.datetime_now = datetime.now()

    def check_registry_client_cert(self):
        registry_certs_dir = certs_dir + self.docker_registry_name
        if os.path.isdir(registry_certs_dir):
            if os.path.exists(registry_certs_dir + "/" + "client.cert"):
                self.client_cert_file_name = registry_certs_dir + "/" + "client.cert"
            if os.path.exists(registry_certs_dir + "/" + "client.key"):
                self.client_key_file_name = registry_certs_dir + "/" + "client.key"
            if os.path.exists(registry_certs_dir + "/" + "ca.crt"):
                self.ca_cert_file_name = registry_certs_dir + "/" + "ca.crt"

    def get_images_list(self, filter_image_name="", filter_image_tag="", filter_image_name_with_tag="",
                        filter_past_days=max_days):
        pass

    def get_self_signed_certs(self):
        verify = True
        if self.ca_cert_file_name:
            verify = self.ca_cert_file_name
        cert = None
        if self.client_cert_file_name and self.client_key_file_name:
            cert = (self.client_cert_file_name, self.client_key_file_name)
        elif self.client_cert_file_name:
            cert = self.client_cert_file_name
        return verify, cert

    def user_select_images(self, image_details_list, is_interactive=True):
        if not image_details_list:
            print("No images found")
            return []
        images_list = [{
            "image_name_with_tag": i["image_name_with_tag"], "image_os": i["image_os"],
            "image_name": i["image_name"]} for i in image_details_list]
        if is_interactive:
            images_list_selected = []
            print("\nImages found in {0}".format(self.registry_type))
            for i in range(len(images_list)):
                print("{0}: {1}, {2}".format(i + 1, image_details_list[i]["image_name_with_tag"],
                                             image_details_list[i]["pushed_at"]))
            print("\nEnter comma separated list of image numbers to run vulnerability scan. Ex: 1,3,4")
            print("Enter \"all\" to scan all images\n")
            user_input = input("-->").split(",")
            if "all" in user_input:
                return images_list
            else:
                for user_input_no in user_input:
                    try:
                        images_list_selected.append(images_list[int(user_input_no) - 1])
                    except:
                        pass
            return images_list_selected
        return images_list

    def delete_images(self, images_list):
        if not images_list:
            return
        print("Deleting downloaded images")
        pid_list = []
        for img in images_list:
            del_img = img["image_name_with_tag"]
            image_path = get_tmp_path(del_img + "_" + self.datetime_now.strftime("%Y-%m-%dT%H:%M:%S") + ".000")
            try:
                shutil.rmtree(image_path, ignore_errors=True)
            except:
                pass
        for pid_val in pid_list:
            pid_val.communicate()

    def get_repo_path_for_windows_images(self, image_name_with_tag):
        if self.registry_type == REGISTRY_TYPE_DOCKER_HUB:
            # {0}/{1}:{2}
            registry_url = "registry-1.docker.io"
            split_img_name = image_name_with_tag.split("/")
            repository_name = split_img_name[0]
            if not repository_name:
                return {}
            split_image = split_img_name[1].split(":")
            image = split_image[0]
            if not image:
                return {}
            tag = split_image[1]
            if not tag:
                tag = "latest"
            return {"full_registry_image_name": registry_url + "/" + repository_name + "/" + image + ":" + tag,
                    "image_layer_file": "/tmp" + "/" + repository_name + "_" + image + ".tar"}
        else:
            return {}

    def scan_images(self, images_list):
        if not images_list:
            return
        if self.update_dependency_data == "false":
            # Volume mount is shared
            images_list_chunks = divide_chunks(images_list, 10)
        else:
            # Download dependency data once
            img_name = images_list[0]["image_name_with_tag"]
            image_path = get_tmp_path(
                img_name + "_" + self.datetime_now.strftime("%Y-%m-%dT%H:%M:%S") + ".000") + "/layers.tar"
            cmd_line = "{0} -mgmt-console-url='{1}' -scan-type='{2}' -image-name='{3}' -scan-id='{4}' -image-path='{5}' -deepfence-key='{6}' -update-dependency-data='{7}' -is-image-local='{8}'".format(
                audit_file, self.mgmt_console_url, self.scan_type, img_name, self.scan_id, image_path,
                self.deepfence_key, self.update_dependency_data, self.is_image_local)
            print("Now running vulnerability scan for image {0}".format(img_name))
            pid_val = Popen(cmd_line, stdin=PIPE, stdout=PIPE, stderr=PIPE, shell=True, bufsize=1,
                            universal_newlines=True)
            std_out, std_err = pid_val.communicate()
            print(std_out)
            print(std_err)
            images_list_chunks = divide_chunks(images_list[1:], 10)
        for img_list in images_list_chunks:
            if not img_list:
                continue
            pid_list = []
            for img in img_list:
                img_name = img["image_name_with_tag"]
                image_path = get_tmp_path(
                    img_name + "_" + self.datetime_now.strftime("%Y-%m-%dT%H:%M:%S") + ".000") + "/layers.tar"
                cmd_line = "{0} -mgmt-console-url='{1}' -scan-type='{2}' -image-name='{3}' -scan-id='{4}' -image-path='{5}' -deepfence-key='{6}' -update-dependency-data='{7}' -is-image-local='{8}'".format(
                    audit_file, self.mgmt_console_url, self.scan_type, img_name, self.scan_id, image_path,
                    self.deepfence_key, self.update_dependency_data, self.is_image_local)
                print("Now running vulnerability scan for image {0}".format(img_name))
                pid_val = Popen(cmd_line, stdin=PIPE, stdout=PIPE, stderr=PIPE, shell=True, bufsize=1,
                                universal_newlines=True)
                pid_list.append(pid_val)
            for pid_val in pid_list:
                std_out, std_err = pid_val.communicate()
                print(std_out)
                print(std_err)
        print("Vulnerability scan finished")

    def docker_login(self):
        pass

    def validate(self):
        return False

    def pull_images(self, images_list):
        if not images_list:
            return
        print("Pulling images", images_list)
        pid_list = []
        for img in images_list:
            img_name = img["image_name_with_tag"]
            save_path = get_tmp_path(img_name + "_" + self.datetime_now.strftime("%Y-%m-%dT%H:%M:%S") + ".000")
            mkdir_recursive(save_path)
            cmd_line = ["skopeo", "--insecure-policy", "copy", "--authfile", self.docker_config_file,
                        "docker://{}".format(img_name), "docker-archive://{}/layers.tar".format(save_path)]
            pid_val = Popen(cmd_line, stdin=PIPE, stdout=PIPE, shell=False)
            pid_list.append(pid_val)
        for pid_val in pid_list:
            pid_val.communicate()


class CveScanECRImages(CveScanRegistryImages):
    def __init__(self, aws_access_key_id, aws_secret_access_key, aws_region_name, registry_id, target_account_role_arn,
                 use_iam_role):
        super().__init__()
        self.use_iam_role = str(use_iam_role).lower()
        self.aws_access_key_id = aws_access_key_id
        self.aws_secret_access_key = aws_secret_access_key
        self.aws_region_name = aws_region_name
        self.target_account_role_arn = target_account_role_arn
        if self.use_iam_role == "true":
            try:
                if target_account_role_arn:
                    sts_client = boto3.client('sts')
                    assumed_role_object = sts_client.assume_role(
                        RoleArn=target_account_role_arn,
                        RoleSessionName="Deepfence-Console"
                    )
                    credentials = assumed_role_object['Credentials']
                    session = boto3.Session(
                        aws_access_key_id=credentials['AccessKeyId'],
                        aws_secret_access_key=credentials['SecretAccessKey'],
                        aws_session_token=credentials['SessionToken']
                    )
                    self.ecr_client = session.client(REGISTRY_TYPE_ECR, region_name=aws_region_name)
                else:
                    provider = InstanceMetadataProvider(
                        iam_role_fetcher=InstanceMetadataFetcher(timeout=1, num_attempts=2))
                    creds = provider.load().get_frozen_credentials()
                    self.ecr_client = boto3.client(
                        REGISTRY_TYPE_ECR, region_name=aws_region_name, aws_access_key_id=creds.access_key,
                        aws_secret_access_key=creds.secret_key, aws_session_token=creds.token)
            except:
                raise DFError("Error: Could not assume instance role")
        else:
            self.ecr_client = boto3.client(
                REGISTRY_TYPE_ECR, aws_access_key_id=aws_access_key_id, aws_secret_access_key=aws_secret_access_key,
                region_name=aws_region_name)
        self.registry_type = REGISTRY_TYPE_ECR
        self.registry_id = registry_id if registry_id else None
        self.docker_config_path = docker_config_path_prefix + REGISTRY_TYPE_ECR
        self.docker_config_file = "{0}/{1}".format(self.docker_config_path, config_json)
        mkdir_recursive(self.docker_config_path)

    def get_images_list(self, filter_image_name="", filter_image_tag="", filter_image_name_with_tag="",
                        filter_past_days=max_days):
        images_list = []
        repo_list = []
        next_token = None
        try:
            describe_repo_paginator = self.ecr_client.get_paginator('describe_repositories')
            while True:
                done = False
                if self.registry_id:
                    paginator = describe_repo_paginator.paginate(
                        registryId=self.registry_id,
                        PaginationConfig={'PageSize': 1000, 'MaxItems': 1000, 'StartingToken': next_token})
                else:
                    paginator = describe_repo_paginator.paginate(
                        PaginationConfig={'PageSize': 1000, 'MaxItems': 1000, 'StartingToken': next_token})
                for response_list_repo_paginator in paginator:
                    if not response_list_repo_paginator['repositories']:
                        done = True
                        break
                    for repo in response_list_repo_paginator['repositories']:
                        repo_list.append(repo)
                    if response_list_repo_paginator.get("nextToken"):
                        next_token = response_list_repo_paginator["nextToken"]
                    else:
                        done = True
                        break
                if done:
                    break
        except:
            pass
        if not repo_list:
            return images_list
        image_from_date = datetime.now(tzlocal()) - timedelta(days=filter_past_days)
        image_from_date = image_from_date.replace(hour=0, minute=0, second=0, microsecond=0)
        for repo in repo_list:
            try:
                next_token = None
                describe_image_paginator = self.ecr_client.get_paginator('describe_images')
                while True:
                    done = False
                    for response_describe_image_paginator in describe_image_paginator.paginate(
                            registryId=repo["registryId"], repositoryName=repo["repositoryName"],
                            PaginationConfig={'PageSize': 1000, 'MaxItems': 1000, 'StartingToken': next_token}):
                        if not response_describe_image_paginator.get("imageDetails"):
                            done = True
                            break
                        for image_detail in response_describe_image_paginator["imageDetails"]:
                            if not image_detail.get("imageTags"):
                                continue
                            if filter_image_name:
                                if filter_image_name not in repo["repositoryUri"]:
                                    continue
                            if filter_past_days and filter_past_days != max_days and filter_past_days > 0:
                                if image_detail.get("imagePushedAt", None):
                                    if image_from_date > image_detail["imagePushedAt"]:
                                        continue
                            for tag in image_detail["imageTags"]:
                                try:
                                    if filter_image_tag:
                                        if filter_image_tag != tag:
                                            continue
                                    image_name_with_tag = "{0}:{1}".format(repo["repositoryUri"], tag)
                                    if filter_image_name_with_tag:
                                        if filter_image_name_with_tag != image_name_with_tag:
                                            continue
                                    image_details = {
                                        "image_name": repo["repositoryName"], "image_tag": tag, "image_os": "",
                                        "docker_image_size": bytes_to_str(image_detail["imageSizeInBytes"], "m"),
                                        "image_name_with_tag": image_name_with_tag,
                                        "pushed_at": image_detail["imagePushedAt"].strftime("%Y-%m-%dT%H:%M:%S")}
                                    images_list.append(image_details)
                                except:
                                    pass
                        if response_describe_image_paginator.get("nextToken"):
                            next_token = response_describe_image_paginator["nextToken"]
                        else:
                            done = True
                            break
                    if done:
                        break
            except:
                pass
        return images_list

    def docker_login(self):
        # Docker login to ecr
        if self.registry_id:
            tmp_auth_token = self.ecr_client.get_authorization_token(registryIds=[self.registry_id])
        else:
            tmp_auth_token = self.ecr_client.get_authorization_token()
        if tmp_auth_token.get("authorizationData", []):
            auth_data = tmp_auth_token["authorizationData"][0]
            with open(self.docker_config_file, "w") as f:
                json.dump({"auths": {auth_data["proxyEndpoint"]: {"auth": auth_data["authorizationToken"]}}}, f)
        else:
            logging.error("Error logging in to docker")

    def validate(self):
        if self.use_iam_role == "true":
            if not self.aws_region_name:
                if not self.aws_region_name:
                    raise DFError('region is required for iam role')
        else:
            if not self.aws_access_key_id or not self.aws_secret_access_key or not self.aws_region_name:
                raise DFError('access key, secret key and region is required')
        token = None
        try:
            if self.registry_id:
                token = self.ecr_client.get_authorization_token(registryIds=[self.registry_id])
            else:
                token = self.ecr_client.get_authorization_token()
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "")
            if error_code == "InvalidSignatureException" or error_code == "UnrecognizedClientException":
                return False
            if error_code == "AccessDeniedException":
                raise DFError('Client Error: Access Denied', error=e)
            raise DFError("Client Error: Authentication failed", error=e)
        except EndpointConnectionError as e:
            raise DFError(e.args, error=e)
        except Exception as e:
            raise DFError("Something went wrong while validating ECR credentials", error=e)
        if token:
            return True
        return False


class CveScanDockerHubImages(CveScanRegistryImages):
    def __init__(self, docker_hub_namespace, docker_hub_username, docker_hub_password):
        super().__init__()
        self.docker_config_path = docker_config_path_prefix + REGISTRY_TYPE_DOCKER_HUB
        self.registry_type = REGISTRY_TYPE_DOCKER_HUB
        self.docker_config_file = "{0}/{1}".format(self.docker_config_path, config_json)
        mkdir_recursive(self.docker_config_path)
        self.docker_hub_namespace = docker_hub_namespace
        self.docker_hub_username = docker_hub_username
        self.docker_hub_password = docker_hub_password
        self.docker_hub_url = "https://hub.docker.com/v2"

    def validate(self):
        try:
            resp = requests.post(self.docker_hub_url + "/users/login/",
                                 json={"username": self.docker_hub_username, "password": self.docker_hub_password})
            if resp.status_code == 200:
                return True
            else:
                return False
        except Exception as e:
            raise DFError("Something went wrong while validating Docker hub registry credentails", error=e)

    def get_images_list(self, filter_image_name="", filter_image_tag="", filter_image_name_with_tag="",
                        filter_past_days=max_days):
        images_list = []
        try:
            resp = requests.post(self.docker_hub_url + "/users/login/",
                                 json={"username": self.docker_hub_username, "password": self.docker_hub_password})
            auth_token = resp.json().get("token", "")
            if not auth_token:
                return images_list
            image_from_date = datetime.now() - timedelta(days=filter_past_days)
            image_from_date = image_from_date.replace(hour=0, minute=0, second=0, microsecond=0)
            req_header = {"Authorization": "JWT " + auth_token}
            resp = requests.get(
                self.docker_hub_url + "/repositories/" + self.docker_hub_namespace + "/?page_size=100",
                headers=req_header)
            if resp.status_code != 200:
                return images_list
            resp = resp.json()
            results = resp.get("results", [])
            page_no = 2
            next_url = resp.get("next", None)
            while next_url:
                resp = requests.get(
                    self.docker_hub_url + "/repositories/" + self.docker_hub_namespace +
                    "/?page_size=100&page={0}".format(page_no), headers=req_header)
                if resp.status_code != 200:
                    break
                resp = resp.json()
                results.extend(resp.get("results", []))
                next_url = resp.get("next", None)
                page_no += 1
            for result in results:
                if not result.get("last_updated", None):
                    continue
                if not result.get("namespace", "") or not result.get("name", ""):
                    continue
                repo_name = "{0}/{1}".format(result["namespace"], result["name"])
                if filter_image_name:
                    if filter_image_name != repo_name:
                        continue
                if filter_past_days and filter_past_days != max_days and filter_past_days > 0:
                    created_at = datetime.strptime(result["last_updated"].split(".")[0], "%Y-%m-%dT%H:%M:%S")
                    if image_from_date > created_at:
                        continue
                try:
                    resp = requests.get(
                        self.docker_hub_url + "/repositories/{0}/{1}/tags?page_size=100".format(
                            result["namespace"], result["name"]), headers=req_header)
                except:
                    continue
                if resp.status_code != 200:
                    continue
                for tag_result in resp.json().get("results", []):
                    if not tag_result.get("last_updated", None) or not tag_result.get("name", None):
                        continue
                    image_name_with_tag = "{0}/{1}:{2}".format(result["namespace"], result["name"], tag_result["name"])
                    if filter_image_name_with_tag:
                        if filter_image_name_with_tag != image_name_with_tag:
                            continue
                    image_size = 0
                    image_os = ""
                    for tag_detail in tag_result.get("images", []):
                        image_size = tag_detail.get("size", "")
                        if image_size:
                            image_size = bytes_to_str(image_size, "m")
                        else:
                            image_size = ""
                        image_os = tag_detail.get("os", "")
                        break
                    image_details = {"image_name": repo_name, "image_tag": tag_result["name"],
                                     "docker_image_size": image_size, "image_name_with_tag": image_name_with_tag,
                                     "image_os": image_os, "pushed_at": tag_result.get("last_updated", "")}
                    images_list.append(image_details)
        except Exception as e:
            raise DFError("Something went wrong", error=e)
        return images_list

    def docker_login(self):
        with open(self.docker_config_file, "w") as f:
            auth_enc = base64.b64encode(
                "{0}:{1}".format(self.docker_hub_username, self.docker_hub_password).encode('ascii')).decode("utf-8")
            json.dump({"auths": {"https://index.docker.io/v1/": {"auth": auth_enc}}}, f)


class CveScanDockerPrivateRegistryImages(CveScanRegistryImages):
    def __init__(self, docker_pvt_registry_url, docker_pvt_registry_username, docker_pvt_registry_password,
                 repository_prefix=None):
        super().__init__()
        self.docker_config_path = docker_config_path_prefix + REGISTRY_TYPE_DOCKER_PVT
        self.registry_type = REGISTRY_TYPE_DOCKER_PVT
        self.docker_config_file = "{0}/{1}".format(self.docker_config_path, config_json)
        mkdir_recursive(self.docker_config_path)
        if not docker_pvt_registry_url:
            logging.error('CveScanDockerPrivateRegistryImages: empty registry_url')
            raise DFError('registry_url is empty')
        self.docker_pvt_registry_url = docker_pvt_registry_url
        self.docker_registry_name = urlparse(self.docker_pvt_registry_url).netloc
        if not self.docker_registry_name:
            errmsg = 'CveScanDockerPrivateRegistryImages: registry name could not be derived from {}'.format(
                self.docker_pvt_registry_url)
            logging.error(errmsg)
            raise DFError(errmsg)
        self.docker_pvt_registry_username = docker_pvt_registry_username
        self.docker_pvt_registry_password = docker_pvt_registry_password
        self.check_registry_client_cert()
        self.repository_prefix = repository_prefix

    def validate(self):
        try:
            verify, cert = self.get_self_signed_certs()
            resp = requests.get(self.docker_pvt_registry_url + "/v2/_catalog", verify=verify, cert=cert,
                                auth=(self.docker_pvt_registry_username, self.docker_pvt_registry_password))
            if resp.status_code == 200:
                return True
            else:
                return False
        except HTTPError as e:
            raise DFError("HTTP error validating Docker registry credentials", error=e)
        except (ConnectionError, MissingSchema) as e:
            raise DFError("Error communicating with registry {}. Not reachable".format(self.docker_pvt_registry_url),
                          error=e)
        except Exception as e:
            raise DFError("Something went wrong while validating Docker registry credentails", error=e)

    def get_images_list(self, filter_image_name="", filter_image_tag="", filter_image_name_with_tag="",
                        filter_past_days=max_days):
        images_list = []
        verify, cert = self.get_self_signed_certs()
        auth = (self.docker_pvt_registry_username, self.docker_pvt_registry_password)
        catalog_resp = requests.get("{0}/v2/_catalog".format(self.docker_pvt_registry_url),
                                    verify=verify, cert=cert, auth=auth)
        if catalog_resp.status_code != 200:
            return images_list
        image_from_date = datetime.now() - timedelta(days=filter_past_days)
        image_from_date = image_from_date.replace(hour=0, minute=0, second=0, microsecond=0)
        for repo_name in catalog_resp.json().get("repositories", []):
            if self.repository_prefix:
                if not str(repo_name).startswith(self.repository_prefix):
                    continue
            tags_resp_obj = requests.get("{0}/v2/{1}/tags/list".format(self.docker_pvt_registry_url, repo_name),
                                         verify=verify, cert=cert, auth=auth)
            if tags_resp_obj.status_code != 200:
                continue
            tags_resp = tags_resp_obj.json()
            if tags_resp.get("manifest"):
                for digest, manifest in tags_resp["manifest"].items():
                    try:
                        image_size = manifest.get("imageSizeBytes", "")
                        if image_size:
                            image_size = bytes_to_str(image_size, "m")
                        else:
                            image_size = ""
                        pushed_at = int(manifest.get("timeUploadedMs", ""))
                        pushed_at_dt = datetime.fromtimestamp(pushed_at / 1000.0)
                        if filter_past_days and filter_past_days != max_days and filter_past_days > 0:
                            if pushed_at:
                                if image_from_date > pushed_at_dt:
                                    continue
                            else:
                                print("past_days filter not available for {0}".format(repo_name))
                        for tag in manifest.get("tag", []):
                            image_name_with_tag = "{0}/{1}:{2}".format(self.docker_registry_name, repo_name, tag)
                            if filter_image_name_with_tag:
                                if filter_image_name_with_tag != image_name_with_tag:
                                    continue
                            if filter_image_name:
                                if filter_image_name != repo_name:
                                    continue
                            if filter_image_tag:
                                if filter_image_tag != tag:
                                    continue
                            image_details = {"image_name": repo_name, "image_tag": tag, "image_os": "",
                                             "image_name_with_tag": image_name_with_tag,
                                             "docker_image_size": image_size,
                                             "pushed_at": pushed_at_dt.strftime("%Y-%m-%dT%H:%M:%S")}
                            images_list.append(image_details)
                    except:
                        pass
            else:
                for tag in tags_resp.get("tags", []):
                    try:
                        image_name_with_tag = "{0}/{1}:{2}".format(self.docker_registry_name, repo_name, tag)
                        if filter_image_name_with_tag:
                            if filter_image_name_with_tag != image_name_with_tag:
                                continue
                        if filter_image_name:
                            if filter_image_name != repo_name:
                                continue
                        if filter_image_tag:
                            if filter_image_tag != tag:
                                continue
                        pushed_at = ""
                        image_os = ""
                        m_resp = requests.get(
                            "{0}/v2/{1}/manifests/{2}".format(self.docker_pvt_registry_url, repo_name, tag),
                            verify=verify, cert=cert, auth=auth)
                        if m_resp.status_code == 200:
                            history = m_resp.json().get("history", [])
                            if history and history[0].get("v1Compatibility", {}):
                                v1_compatibility = json.loads(history[0]["v1Compatibility"])
                                pushed_at = v1_compatibility["created"]
                                image_os = v1_compatibility["os"]
                        if filter_past_days and filter_past_days != max_days and filter_past_days > 0:
                            if pushed_at:
                                created_at = datetime.strptime(pushed_at.split(".")[0], "%Y-%m-%dT%H:%M:%S")
                                if image_from_date > created_at:
                                    continue
                            else:
                                print("past_days filter not available for {0}".format(image_name_with_tag))
                        image_details = {"image_name": repo_name, "image_tag": tag, "image_os": image_os,
                                         "image_name_with_tag": image_name_with_tag, "pushed_at": pushed_at,
                                         "docker_image_size": ""}
                        images_list.append(image_details)
                    except:
                        pass
        return images_list

    def docker_login(self):
        with open(self.docker_config_file, "w") as f:
            auth_enc = base64.b64encode(
                "{0}:{1}".format(self.docker_pvt_registry_username, self.docker_pvt_registry_password).encode(
                    'ascii')).decode("utf-8")
            json.dump({"auths": {self.docker_registry_name: {"auth": auth_enc}}}, f)


class CveScanAzureRegistryImages(CveScanDockerPrivateRegistryImages):
    def __init__(self, azure_registry_url, azure_registry_username, azure_registry_password):
        super().__init__(azure_registry_url, azure_registry_username, azure_registry_password)


class CveScanGoogleRegistryImages(CveScanDockerPrivateRegistryImages):
    def __init__(self, registry_hostname, service_account_json, project_id):
        super().__init__(registry_hostname, "_json_key", service_account_json, repository_prefix=project_id + "/")


class CveScanHarborRegistryImages(CveScanRegistryImages):
    def __init__(self, harbor_registry_url, harbor_registry_username, harbor_registry_password):
        super().__init__()
        self.docker_config_path = docker_config_path_prefix + REGISTRY_TYPE_HARBOR
        self.registry_type = REGISTRY_TYPE_HARBOR
        self.docker_config_file = "{0}/{1}".format(self.docker_config_path, config_json)
        mkdir_recursive(self.docker_config_path)
        self.harbor_registry_url = harbor_registry_url
        self.docker_registry_name = urlparse(self.harbor_registry_url).netloc
        self.harbor_registry_username = harbor_registry_username
        self.harbor_registry_password = harbor_registry_password
        self.check_registry_client_cert()

    def validate(self):
        try:
            verify, cert = self.get_self_signed_certs()
            resp = requests.get("{0}/api/search?q=".format(self.harbor_registry_url), verify=verify, cert=cert,
                                auth=(self.harbor_registry_username, self.harbor_registry_password))
            if resp.status_code == 200:
                return True
            else:
                return False
        except HTTPError as e:
            if e.response.status_code == 401:
                return False
            raise DFError("HTTP error validating Harbor registry credentials", error=e)
        except (ConnectionError, MissingSchema) as e:
            raise DFError("Error communicating with registry {}. Not reachable".format(self.harbor_registry_url),
                          error=e)
        except Exception as e:
            raise DFError("Something went wrong while validating Harbor registry credentails", error=e)

    def get_images_list(self, filter_image_name="", filter_image_tag="", filter_image_name_with_tag="",
                        filter_past_days=max_days):
        images_list = []
        try:
            image_from_date = datetime.now() - timedelta(days=filter_past_days)
            image_from_date = image_from_date.replace(hour=0, minute=0, second=0, microsecond=0)
            session = requests.Session()
            session.auth = (self.harbor_registry_username, self.harbor_registry_password)
            verify, cert = self.get_self_signed_certs()
            harbor_repos = session.get("{0}/api/search?q=".format(self.harbor_registry_url), verify=verify,
                                       cert=cert).json()
            if not harbor_repos.get("repository", []):
                return images_list
            for repo in harbor_repos["repository"]:
                repo_name = repo.get("repository_name", "")
                if not repo_name:
                    continue
                repo_tags = session.get("{0}/api/repositories/{1}/tags?detail=true".format(
                    self.harbor_registry_url, repo_name), verify=verify, cert=cert).json()
                for repo_tag in repo_tags:
                    tag = repo_tag.get("name", "")
                    if not tag:
                        continue
                    image_name_with_tag = "{0}/{1}:{2}".format(self.docker_registry_name, repo_name, tag)
                    if filter_image_name_with_tag:
                        if filter_image_name_with_tag != image_name_with_tag:
                            continue
                    if filter_image_name:
                        if filter_image_name != repo_name:
                            continue
                    if filter_image_tag:
                        if filter_image_tag != tag:
                            continue
                    pushed_at = repo_tag.get("push_time", "")
                    image_os = repo_tag.get("os", "")
                    if not pushed_at:
                        pushed_at = repo_tag.get("created", "")
                    if filter_past_days and filter_past_days != max_days and filter_past_days > 0 and pushed_at:
                        push_time = datetime.strptime(pushed_at.split(".")[0], "%Y-%m-%dT%H:%M:%S")
                        if image_from_date > push_time:
                            continue
                    image_size = repo_tag.get("size", "")
                    if image_size:
                        image_size = bytes_to_str(image_size, "m")
                    else:
                        image_size = ""
                    image_details = {
                        "image_name": repo_name, "image_tag": tag, "image_name_with_tag": image_name_with_tag,
                        "pushed_at": pushed_at, "docker_image_size": image_size, "image_os": image_os}
                    images_list.append(image_details)
        except Exception as e:
            raise DFError("Something went wrong", error=e)
        return images_list

    def docker_login(self):
        # Docker login to harbor
        with open(self.docker_config_file, "w") as f:
            auth_enc = base64.b64encode(
                "{0}:{1}".format(self.harbor_registry_username, self.harbor_registry_password).encode(
                    'ascii')).decode("utf-8")
            json.dump({"auths": {self.docker_registry_name: {"auth": auth_enc}}}, f)


class CveScanQuayRegistryImages(CveScanRegistryImages):
    def __init__(self, quay_registry_url, quay_namespace, quay_access_token):
        super().__init__()
        self.docker_config_path = docker_config_path_prefix + REGISTRY_TYPE_QUAY
        self.registry_type = REGISTRY_TYPE_QUAY
        self.docker_config_file = "{0}/{1}".format(self.docker_config_path, config_json)
        mkdir_recursive(self.docker_config_path)
        self.quay_registry_url = quay_registry_url
        self.docker_registry_name = urlparse(self.quay_registry_url).netloc
        self.quay_namespace = quay_namespace
        self.quay_access_token = quay_access_token
        self.check_registry_client_cert()

    def validate(self):
        try:
            headers = {}
            if self.quay_access_token:
                headers["Authorization"] = "Bearer " + self.quay_access_token
            verify, cert = self.get_self_signed_certs()
            resp = requests.get(
                "{0}/api/v1/repository?public=true&namespace={1}".format(self.quay_registry_url, self.quay_namespace),
                verify=verify, cert=cert, headers=headers)
            if resp.status_code == 200:
                return True
            else:
                return False
        except HTTPError as e:
            if e.response.status_code == 401:
                return False
            raise DFError("HTTP error validating Quay registry credentials", error=e)
        except (ConnectionError, MissingSchema) as e:
            raise DFError("Error communicating with registry {}. Not reachable".format(self.quay_registry_url),
                          error=e)
        except Exception as e:
            raise DFError("Something went wrong while validating Quay registry credentails", error=e)

    def get_images_list(self, filter_image_name="", filter_image_tag="", filter_image_name_with_tag="",
                        filter_past_days=max_days):
        images_list = []
        try:
            image_from_date = datetime.now() - timedelta(days=filter_past_days)
            image_from_date = image_from_date.replace(hour=0, minute=0, second=0, microsecond=0)
            session = requests.Session()
            if self.quay_access_token:
                session.headers = {"Authorization": "Bearer " + self.quay_access_token}
            session.verify, session.cert = self.get_self_signed_certs()
            quay_repos = []
            next_page = ""
            for i in range(1000):
                quay_repos_resp = session.get(
                    "{0}/api/v1/repository?public=true&last_modified=true&namespace={1}&next_page={2}".format(
                        self.quay_registry_url, self.quay_namespace, next_page)).json()
                repos = quay_repos_resp.get("repositories", [])
                if not repos:
                    break
                quay_repos.extend(repos)
                next_page = quay_repos_resp.get("next_page", "")
                if not next_page:
                    break
            if not quay_repos:
                return images_list
            for repo in quay_repos:
                repo_name = "{0}/{1}".format(self.quay_namespace, repo["name"])
                if not repo_name:
                    continue
                if filter_image_name:
                    if filter_image_name != repo_name:
                        continue
                image_resp = session.get(
                    "{0}/api/v1/repository/{1}?includeTags=true&includeStats=false".format(
                        self.quay_registry_url, repo_name)).json()
                if image_resp.get("kind", "") != "image":
                    continue
                if not image_resp.get("tags", {}):
                    continue
                for repo_tag, tag_details in image_resp["tags"].items():
                    tag = tag_details.get("name", "")
                    if not tag:
                        continue
                    image_name_with_tag = "{0}/{1}/{2}:{3}".format(self.docker_registry_name, self.quay_namespace,
                                                                   repo["name"], tag)
                    if filter_image_name_with_tag:
                        if filter_image_name_with_tag != image_name_with_tag:
                            continue
                    if filter_image_tag:
                        if filter_image_tag != tag:
                            continue
                    push_time = datetime.strptime(tag_details["last_modified"], "%a, %d %b %Y %H:%M:%S %z")
                    if filter_past_days and filter_past_days != max_days and filter_past_days > 0:
                        if image_from_date > push_time:
                            continue
                    image_size = tag_details.get("size", "")
                    if image_size:
                        image_size = bytes_to_str(image_size, "m")
                    else:
                        image_size = ""
                    image_details = {
                        "image_name": "{0}/{1}".format(self.docker_registry_name, repo_name), "image_tag": tag,
                        "image_name_with_tag": image_name_with_tag, "docker_image_size": image_size, "image_os": "",
                        "pushed_at": push_time.strftime("%Y-%m-%dT%H:%M:%S")}
                    images_list.append(image_details)
        except Exception as e:
            raise DFError("Something went wrong", error=e)
        return images_list

    def docker_login(self):
        with open(self.docker_config_file, "w") as f:
            auths = {}
            if self.quay_access_token:
                auth_enc = base64.b64encode(
                    "$oauthtoken:{0}".format(self.quay_access_token).encode('ascii')).decode("utf-8")
                auths = {self.docker_registry_name: {"auth": auth_enc}}
            json.dump({"auths": auths}, f)


class CveScanGitlabRegistryImages(CveScanRegistryImages):
    def __init__(self, gitlab_server_url, gitlab_registry_url, gitlab_access_token):
        super().__init__()
        self.docker_config_path = docker_config_path_prefix + REGISTRY_TYPE_GITLAB
        self.registry_type = REGISTRY_TYPE_GITLAB
        self.docker_config_file = "{0}/{1}".format(self.docker_config_path, config_json)
        mkdir_recursive(self.docker_config_path)
        self.gitlab_server_url = gitlab_server_url
        self.gitlab_access_token = gitlab_access_token
        self.gitlab_registry_url = gitlab_registry_url
        self.docker_registry_name = self.gitlab_registry_url
        if str(self.gitlab_registry_url).startswith("http"):
            self.docker_registry_name = urlparse(self.gitlab_registry_url).netloc
        self.check_registry_client_cert()
        session = requests.Session()
        verify, cert = self.get_self_signed_certs()
        session.cert = cert
        session.verify = verify

    def validate(self):
        try:
            proj_resp = requests.get(
                self.gitlab_server_url, params={'simple': 'false', 'membership': 'true'},
                headers={'PRIVATE-TOKEN': self.gitlab_access_token}
            )
            proj_resp.raise_for_status()
            return True
        except HTTPError as http_err:
            raise DFError(f'HTTP Error occurred: {http_err}')
        except Exception as err:
            raise DFError(f'General Exception occurred: {err}')

    def get_images_list(self, filter_image_name="", filter_image_tag="", filter_image_name_with_tag="",
                        filter_past_days=max_days):
        GITLAB_BASE_URL = self.gitlab_server_url + "/api/v4/projects"
        GITLAB_REGISTRY_DETAILS_URL = self.gitlab_server_url + "/api/v4/projects/{0}/registry/repositories"
        GITLAB_TAG_DETAILS_URL = self.gitlab_server_url + "/api/v4/projects/{0}/registry/repositories/{1}/tags/{2}/"
        GITLAB_ID_TAG = "id"
        GITLAB_TAG_COUNT = "tags_count"
        GITLAB_TAG = "tags"
        GITLAB_TAG_NAME = "name"
        GITLAB_TAG_PATH = "path"
        GITLAB_TAG_LOCATION = "location"
        GITLAB_TAG_CREATED_AT = "created_at"
        GITLAB_TAG_TOTAL_SIZE = "total_size"

        image_from_date = (datetime.now(tzlocal()) - timedelta(days=filter_past_days)).replace(
            hour=0, minute=0, second=0, microsecond=0)
        result_list = []
        try:
            proj_resp = requests.get(
                GITLAB_BASE_URL,
                params={'simple': 'false', 'membership': 'true'},
                headers={'PRIVATE-TOKEN': self.gitlab_access_token}
            )
            proj_resp.raise_for_status()
            project_list = proj_resp.json()
            total_projects = len(project_list)
            if total_projects == 0:
                return result_list
            for i in range(0, total_projects):
                project_id = (project_list[i])[GITLAB_ID_TAG]
                registry_resp = requests.get(
                    GITLAB_REGISTRY_DETAILS_URL.format(str(project_id)),
                    params={'tags': 'true', 'tags_count': 'true'},
                    headers={'PRIVATE-TOKEN': self.gitlab_access_token}
                )
                registry_list = registry_resp.json()
                if not registry_list:
                    continue
                try:
                    tag_count = (registry_list[0])[GITLAB_TAG_COUNT]
                    if tag_count <= 0:
                        continue
                    registry_id = (registry_list[0])[GITLAB_ID_TAG]
                    tags_list = (registry_list[0])[GITLAB_TAG]
                    for j in range(0, tag_count):
                        tag_name = (tags_list[j])[GITLAB_TAG_NAME]
                        tag_details_resp = requests.get(
                            GITLAB_TAG_DETAILS_URL.format(str(project_id), str(registry_id), str(tag_name)),
                            headers={'PRIVATE-TOKEN': self.gitlab_access_token}
                        )
                        tag_details = tag_details_resp.json()
                        if not tag_details:
                            continue
                        tmp_image_name = (tag_details[GITLAB_TAG_PATH]).split(":")[0]
                        if filter_image_name and filter_image_name != tmp_image_name:
                            continue
                        if filter_image_tag and filter_image_tag != tag_details[GITLAB_TAG_NAME]:
                            continue
                        tmp_image_date = datetime.strptime(tag_details[GITLAB_TAG_CREATED_AT].split(".")[0],
                                                           "%Y-%m-%dT%H:%M:%S")
                        if filter_past_days and filter_past_days != max_days and filter_past_days > 0:
                            if image_from_date > tmp_image_date:
                                continue
                        if filter_image_name_with_tag and filter_image_name_with_tag != \
                                tag_details[GITLAB_TAG_LOCATION]:
                            continue
                        image_details = {
                            "image_name": tmp_image_name,
                            "image_tag": tag_details[GITLAB_TAG_NAME],
                            "image_name_with_tag": tag_details[GITLAB_TAG_LOCATION],
                            "image_os": "",
                            "pushed_at": tmp_image_date.strftime("%Y-%m-%dT%H:%M:%S"),
                            "docker_image_size": bytes_to_str(tag_details[GITLAB_TAG_TOTAL_SIZE], "m")
                        }
                        result_list.append(image_details)
                except Exception as err:
                    continue
        except HTTPError as http_err:
            raise DFError(f'HTTP Error occurred: {http_err}')
        except Exception as err:
            raise DFError(f'General Exception occurred: {err}')
        return result_list

    def docker_login(self):
        with open(self.docker_config_file, "w") as f:
            auth_enc = base64.b64encode(
                "{0}:{1}".format("gitlab-ci-token", self.gitlab_access_token).encode('ascii')).decode("utf-8")
            json.dump({"auths": {self.docker_registry_name: {"auth": auth_enc}}}, f)


class CveScanJfrogRegistryImages(CveScanRegistryImages):
    def __init__(self, jfrog_registry_url, jfrog_repository, jfrog_username, jfrog_password):
        super().__init__()
        self.docker_config_path = docker_config_path_prefix + REGISTRY_TYPE_JFROG
        self.registry_type = REGISTRY_TYPE_JFROG
        self.docker_config_file = "{0}/{1}".format(self.docker_config_path, config_json)
        mkdir_recursive(self.docker_config_path)
        self.jfrog_registry_url = jfrog_registry_url
        self.docker_registry_name = urlparse(self.jfrog_registry_url).netloc
        self.jfrog_repository = jfrog_repository
        self.jfrog_username = jfrog_username
        self.jfrog_password = jfrog_password
        self.check_registry_client_cert()

    def validate(self):
        try:
            verify, cert = self.get_self_signed_certs()
            resp = requests.get(
                "{0}/artifactory/api/docker/{1}/v2/_catalog?n=1".format(self.jfrog_registry_url, self.jfrog_repository),
                verify=verify, cert=cert, auth=(self.jfrog_username, self.jfrog_password))
            if resp.status_code == 200:
                print(resp.json())
                return True
            else:
                return False
        except HTTPError as e:
            if e.response.status_code == 401:
                return False
            raise DFError("HTTP error validating Jfrog registry credentials", error=e)
        except (ConnectionError, MissingSchema) as e:
            raise DFError("Error communicating with registry {}. Not reachable".format(self.jfrog_registry_url),
                          error=e)
        except Exception as e:
            raise DFError("Something went wrong while validating Jfrog registry credentails", error=e)

    def get_images_list(self, filter_image_name="", filter_image_tag="", filter_image_name_with_tag="",
                        filter_past_days=max_days):
        images_list = []
        try:
            image_from_date = datetime.now() - timedelta(days=filter_past_days)
            image_from_date = image_from_date.replace(hour=0, minute=0, second=0, microsecond=0)
            session = requests.Session()
            session.auth = (self.jfrog_username, self.jfrog_password)
            verify, cert = self.get_self_signed_certs()
            resp = session.get(
                "{0}/artifactory/api/docker/{1}/v2/_catalog".format(self.jfrog_registry_url, self.jfrog_repository),
                verify=verify, cert=cert).json()
            if not resp.get("repositories", []):
                return images_list
            for repo_name in resp["repositories"]:
                if filter_image_name:
                    if filter_image_name != repo_name:
                        continue
                tags_resp = session.get(
                    "{0}/artifactory/api/docker/{1}/v2/{2}/tags/list".format(
                        self.jfrog_registry_url, self.jfrog_repository, repo_name), verify=verify, cert=cert)
                if tags_resp.status_code != 200:
                    continue
                for tag in tags_resp.json().get("tags", []):
                    try:
                        image_name_with_tag = "{0}/{1}/{2}:{3}".format(self.docker_registry_name, self.jfrog_repository,
                                                                       repo_name, tag)
                        if filter_image_name_with_tag:
                            if filter_image_name_with_tag != image_name_with_tag:
                                continue
                        if filter_image_name:
                            if filter_image_name != repo_name:
                                continue
                        if filter_image_tag:
                            if filter_image_tag != tag:
                                continue
                        pushed_at = ""
                        m_resp = session.get("{0}/artifactory/api/docker/{1}/v2/{2}/manifests/{3}".format(
                            self.jfrog_registry_url, self.jfrog_repository, repo_name, tag),
                            verify=verify, cert=cert)
                        if m_resp.status_code == 200:
                            history = m_resp.json().get("history", [])
                            if history and history[0].get("v1Compatibility", {}):
                                v1_compatibility = json.loads(history[0]["v1Compatibility"])
                                pushed_at = v1_compatibility["created"]
                        if filter_past_days and filter_past_days != max_days and filter_past_days > 0:
                            if pushed_at:
                                created_at = datetime.strptime(pushed_at.split(".")[0], "%Y-%m-%dT%H:%M:%S")
                                if image_from_date > created_at:
                                    continue
                            else:
                                print("past_days filter not available for {0}".format(image_name_with_tag))
                        image_details = {"image_name": repo_name, "image_tag": tag,
                                         "image_name_with_tag": image_name_with_tag, "pushed_at": pushed_at,
                                         "docker_image_size": "", "image_os": ""}
                        images_list.append(image_details)
                    except Exception as e:
                        raise DFError("Something went wrong", error=e)
        except Exception as e:
            raise DFError("Something went wrong", error=e)
        return images_list

    def docker_login(self):
        with open(self.docker_config_file, "w") as f:
            auth_enc = base64.b64encode(
                "{0}:{1}".format(self.jfrog_username, self.jfrog_password).encode(
                    'ascii')).decode("utf-8")
            json.dump({"auths": {self.docker_registry_name: {"auth": auth_enc}}}, f)
