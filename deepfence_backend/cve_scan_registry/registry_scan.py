import logging
import argparse
import sys
from scan_registry.cve_scan_registry import max_days, CveScanECRImages, CveScanDockerPrivateRegistryImages, \
    CveScanHarborRegistryImages, CveScanAzureRegistryImages, REGISTRY_TYPE_DOCKER_PVT, REGISTRY_TYPE_HARBOR, \
    REGISTRY_TYPE_ECR, REGISTRY_TYPE_AZURE, REGISTRY_TYPE_DOCKER_HUB, CveScanDockerHubImages, REGISTRY_TYPE_QUAY, \
    CveScanQuayRegistryImages, REGISTRY_TYPE_GITLAB, CveScanGitlabRegistryImages, REGISTRY_TYPE_GCLOUD, \
    CveScanGoogleRegistryImages, REGISTRY_TYPE_JFROG, CveScanJfrogRegistryImages
from utils.credentials import get_registry_credential

logging.basicConfig(level=logging.ERROR)


class DfParser(argparse.ArgumentParser):
    def error(self, message):
        if not message.startswith("unrecognized arguments"):
            sys.stderr.write('error: %s\n' % message)
            self.print_help()
            sys.exit(2)


arg_parser = DfParser(
    prog="docker run -it --rm --net=host --ulimit core=0 --cpus=\"2\" -v /etc/docker/certs.d:/etc/docker/certs.d -v /var/run/docker.sock:/var/run/docker.sock --entrypoint=\"python3\" deepfence_vulnerability_mapper_ce:latest registry_scan.py --help",
    description="Run vulnerability scan on images in various docker registries")
required_args = arg_parser.add_argument_group('required arguments')
required_args.add_argument("--registry_type", metavar="registry_type", type=str, required=True,
                           help="Docker registry type: ecr | docker_hub | docker_private_registry | harbor | azure_container_registry | quay | gitlab")
arg_parser.add_argument("--scan_type", metavar="scan_type", type=str, required=False,
                        default="base,java,python,ruby,php,nodejs,js,dotnet",
                        help="CVE scan types (comma separated): base,java,python,ruby,php,nodejs,js,dotnet. Default: base")
arg_parser.add_argument("--mgmt_console_url", metavar="mgmt_console_url", type=str, required=False, default="127.0.0.1",
                        help="Ip address of Deepfence management console. Default: 127.0.0.1:443")
arg_parser.add_argument("--scan_id", metavar="scan_id", type=str, required=False, default="",
                        help="Scan id (optional)")
arg_parser.add_argument("--deepfence_key", metavar="deepfence_key", type=str, required=False, default="",
                        help="Deepfence key")
arg_parser.add_argument("--update_dependency_data", metavar="update_dependency_data", type=str, required=False,
                        default="true", help="Update dependency data")
arg_parser.add_argument("--past_days", metavar="past_days", type=int, required=False, default=max_days,
                        help="Filter images published in past 'n' days")
arg_parser.add_argument("--image_name", metavar="image_name", type=str, required=False,
                        help="Filter images by image name. Eg: only scan 'nginx' image")
arg_parser.add_argument("--image_name_with_tag", metavar="image_name_with_tag", type=str, required=False,
                        help="Filter images by image_name:tag. Eg: only scan 'deepfenceio/deepfence:latest' image")
arg_parser.add_argument("--image_tag", metavar="image_tag", type=str, required=False,
                        help="Filter images by tag name. Eg: only scan 'latest' tag")
arg_parser.add_argument("--is_image_local", metavar="is_image_local", type=str, required=False,
                        default="false", help="Set to true if ci/cd scan or command line scan")
arg_parser.add_argument('-i', action="store_const",
                        const=True, help="Make this session interactive")
arg_parser.add_argument("--credential_id", metavar="credential_id", type=str, required=False, default="",
                        help="Credential id (optional)")


def main():
    cmd_args = arg_parser.parse_args()
    is_interactive = cmd_args.i
    registry_type = cmd_args.registry_type
    registry_scanner = None
    credential_id = cmd_args.credential_id
    api_url = cmd_args.mgmt_console_url
    api_key = cmd_args.deepfence_key

    if credential_id:
        scan_details = None
        try:
            scan_details = get_registry_credential(credential_id, api_url, api_key)
        except Exception as ex:
            print("Error: {}\n".format(ex))
            return
        if registry_type == REGISTRY_TYPE_ECR:
            try:
                registry_scanner = CveScanECRImages(
                    scan_details.get("aws_access_key_id", ""),
                    scan_details.get("aws_secret_access_key", ""),
                    scan_details["aws_region_name"],
                    scan_details.get("registry_id", ""),
                    scan_details.get("target_account_role_arn", ""),
                    str(scan_details.get("use_iam_role", "false")).lower())
            except Exception as ex:
                print("Error: {}\n".format(ex))
                arg_parser.print_help()
        elif registry_type == REGISTRY_TYPE_HARBOR:
            try:
                registry_scanner = CveScanHarborRegistryImages(
                    scan_details["harbor_registry_url"],
                    scan_details["harbor_username"],
                    scan_details["harbor_password"])
            except Exception as ex:
                print("Error: {}\n".format(ex))
                arg_parser.print_help()
        elif registry_type == REGISTRY_TYPE_DOCKER_HUB:
            try:
                registry_scanner = CveScanDockerHubImages(
                    scan_details["docker_hub_namespace"],
                    scan_details["docker_hub_username"],
                    scan_details["docker_hub_password"])
            except Exception as ex:
                print("Error: {}\n".format(ex))
                arg_parser.print_help()

        elif registry_type == REGISTRY_TYPE_DOCKER_PVT:
            try:
                registry_scanner = CveScanDockerPrivateRegistryImages(
                    scan_details["docker_registry_url"],
                    scan_details["docker_username"],
                    scan_details["docker_password"])
            except Exception as ex:
                print("Error: {}\n".format(ex))
                arg_parser.print_help()
        elif registry_type == REGISTRY_TYPE_QUAY:
            try:
                registry_scanner = CveScanQuayRegistryImages(
                    scan_details["quay_registry_url"], scan_details["quay_namespace"],
                    scan_details.get("quay_access_token", ""))
            except Exception as ex:
                print("Error: {}\n".format(ex))
                arg_parser.print_help()

        elif registry_type == REGISTRY_TYPE_AZURE:
            try:
                registry_scanner = CveScanAzureRegistryImages(
                    scan_details["azure_registry_url"],
                    scan_details["azure_registry_username"],
                    scan_details["azure_registry_password"])
            except Exception as ex:
                print("Error: {}\n".format(ex))
                arg_parser.print_help()
        elif registry_type == REGISTRY_TYPE_GITLAB:
            try:
                registry_scanner = CveScanGitlabRegistryImages(
                    scan_details["gitlab_server_url"],
                    scan_details["gitlab_registry_url"],
                    scan_details["gitlab_access_token"])
            except Exception as ex:
                print("Error: {}\n".format(ex))
                arg_parser.print_help()
        elif registry_type == REGISTRY_TYPE_GCLOUD:
            try:
                registry_scanner = CveScanGoogleRegistryImages(
                    scan_details["registry_hostname"],
                    scan_details["service_account_json"],
                    scan_details["project_id"])
            except Exception as ex:
                print("Error: {}\n".format(ex))
                arg_parser.print_help()
        elif registry_type == REGISTRY_TYPE_JFROG:
            try:
                registry_scanner = CveScanJfrogRegistryImages(
                    scan_details["jfrog_registry_url"],
                    scan_details["jfrog_repository"],
                    scan_details["jfrog_username"],
                    scan_details["jfrog_password"])
            except Exception as ex:
                print("Error: {}\n".format(ex))
                arg_parser.print_help()

    else:
        if registry_type == REGISTRY_TYPE_ECR:
            ecr_args = arg_parser.add_argument_group('ecr arguments')
            ecr_args.add_argument("--aws_access_key_id", metavar="aws_access_key_id", type=str, required=False,
                                  help="AWS access key")
            ecr_args.add_argument("--aws_secret_access_key", metavar="aws_secret_access_key", type=str, required=False,
                                  help="AWS secret key")
            ecr_args.add_argument("--aws_region_name", metavar="aws_region_name", type=str, required=True,
                                  help="AWS region name")
            ecr_args.add_argument("--registry_id", metavar="registry_id", type=str, required=False,
                                  help="ECR Registry Account Id")
            ecr_args.add_argument("--target_account_role_arn", metavar="target_account_role_arn", type=str,
                                  required=False, help="Role ARN in target Account to assume in the console")
            ecr_args.add_argument("--use_iam_role", metavar="use_iam_role", type=str, required=True,
                                  help="Use IAM Role instead of credentials")
            cmd_args = arg_parser.parse_args()
            try:
                registry_scanner = CveScanECRImages(
                    cmd_args.aws_access_key_id, cmd_args.aws_secret_access_key, cmd_args.aws_region_name,
                    cmd_args.registry_id, cmd_args.target_account_role_arn, cmd_args.use_iam_role)
            except Exception as ex:
                print("Error: {}\n".format(ex))
                arg_parser.print_help()
        elif registry_type == REGISTRY_TYPE_DOCKER_PVT:
            pvt_reg_args = arg_parser.add_argument_group(
                'docker private registry arguments')
            pvt_reg_args.add_argument("--docker_registry_url", metavar="docker_registry_url", required=True,
                                      type=str, help="Docker private registry url. Eg: https://registry.deepfence.io")
            pvt_reg_args.add_argument("--docker_username", metavar="docker_username",
                                      type=str, required=True, help="Docker private registry username")
            pvt_reg_args.add_argument("--docker_password", metavar="docker_password",
                                      type=str, required=True, help="Docker private registry password")
            cmd_args = arg_parser.parse_args()
            try:
                registry_scanner = CveScanDockerPrivateRegistryImages(
                    cmd_args.docker_registry_url, cmd_args.docker_username, cmd_args.docker_password)
            except Exception as ex:
                print("Error: {}\n".format(ex))
                arg_parser.print_help()
        elif registry_type == REGISTRY_TYPE_HARBOR:
            harbor_args = arg_parser.add_argument_group(
                'harbor registry arguments')
            harbor_args.add_argument("--harbor_registry_url", metavar="harbor_registry_url", required=True,
                                     type=str, help="Harbor registry url. Eg: https://registry.deepfence.io")
            harbor_args.add_argument("--harbor_username", metavar="harbor_username",
                                     type=str, required=True, help="Harbor registry username")
            harbor_args.add_argument("--harbor_password", metavar="harbor_password",
                                     type=str, required=True, help="Harbor registry password")
            cmd_args = arg_parser.parse_args()
            try:
                registry_scanner = CveScanHarborRegistryImages(
                    cmd_args.harbor_registry_url, cmd_args.harbor_username, cmd_args.harbor_password)
            except Exception as ex:
                print("Error: {}\n".format(ex))
                arg_parser.print_help()
        elif registry_type == REGISTRY_TYPE_AZURE:
            azure_args = arg_parser.add_argument_group(
                'azure container registry arguments')
            azure_args.add_argument("--azure_registry_url", metavar="azure_registry_url", required=True,
                                    type=str, help="Azure container registry url. Eg: https://deepfence.azurecr.io")
            azure_args.add_argument("--azure_registry_username", metavar="azure_registry_username",
                                    type=str, required=True, help="Azure container registry username")
            azure_args.add_argument("--azure_registry_password", metavar="azure_registry_password",
                                    type=str, required=True, help="Azure container registry password")
            cmd_args = arg_parser.parse_args()
            try:
                registry_scanner = CveScanAzureRegistryImages(
                    cmd_args.azure_registry_url, cmd_args.azure_registry_username, cmd_args.azure_registry_password)
            except Exception as ex:
                print("Error: {}\n".format(ex))
                arg_parser.print_help()
        elif registry_type == REGISTRY_TYPE_DOCKER_HUB:
            docker_hub_args = arg_parser.add_argument_group(
                'docker hub arguments')
            docker_hub_args.add_argument("--docker_hub_namespace", metavar="docker_hub_namespace", required=True,
                                         type=str, help="Organization namespace. Eg: deepfenceio")
            docker_hub_args.add_argument("--docker_hub_username", metavar="docker_hub_username",
                                         type=str, required=True, help="Docker hub username")
            docker_hub_args.add_argument("--docker_hub_password", metavar="docker_hub_password",
                                         type=str, required=True, help="Docker hub password")
            cmd_args = arg_parser.parse_args()
            try:
                registry_scanner = CveScanDockerHubImages(
                    cmd_args.docker_hub_namespace, cmd_args.docker_hub_username, cmd_args.docker_hub_password)
            except Exception as ex:
                print("Error: {}\n".format(ex))
                arg_parser.print_help()
        elif registry_type == REGISTRY_TYPE_QUAY:
            quay_args = arg_parser.add_argument_group('quay arguments')
            quay_args.add_argument("--quay_registry_url", metavar="quay_registry_url", required=True,
                                   type=str, help="Quay registry url")
            quay_args.add_argument("--quay_namespace", metavar="quay_namespace", required=True,
                                   type=str, help="Quay namespace")
            quay_args.add_argument("--quay_access_token", metavar="quay_access_token",
                                   type=str, required=False, help="OAuth 2 Access Token")
            cmd_args = arg_parser.parse_args()
            try:
                registry_scanner = CveScanQuayRegistryImages(
                    cmd_args.quay_registry_url, cmd_args.quay_namespace, cmd_args.quay_access_token)
            except Exception as ex:
                print("Error: {}\n".format(ex))
                arg_parser.print_help()
        elif registry_type == REGISTRY_TYPE_GITLAB:
            gitlab_args = arg_parser.add_argument_group('gitlab arguments')
            gitlab_args.add_argument("--gitlab_server_url", metavar="gitlab_server_url", required=True,
                                     type=str, help="Gitlab server url")
            gitlab_args.add_argument("--gitlab_registry_url", metavar="gitlab_registry_url", required=True,
                                     type=str, help="Gitlab registry url")
            gitlab_args.add_argument("--gitlab_access_token", metavar="gitlab_access_token",
                                     required=True, type=str, help="Gitlab personal access token")
            cmd_args = arg_parser.parse_args()
            try:
                registry_scanner = CveScanGitlabRegistryImages(
                    cmd_args.gitlab_server_url, cmd_args.gitlab_registry_url, cmd_args.gitlab_access_token)
            except Exception as ex:
                print("Error: {}\n".format(ex))
                arg_parser.print_help()
        elif registry_type == REGISTRY_TYPE_GCLOUD:
            gcloud_args = arg_parser.add_argument_group('gcloud arguments')
            gcloud_args.add_argument("--registry_hostname", metavar="registry_hostname", required=True,
                                     type=str, help="Google cloud registry url")
            gcloud_args.add_argument("--service_account_json", metavar="service_account_json",
                                     required=True, type=str, help="Service account json")
            gcloud_args.add_argument("--project_id", metavar="project_id",
                                     required=True, type=str, help="Project id")
            cmd_args = arg_parser.parse_args()
            try:
                registry_scanner = CveScanGoogleRegistryImages(
                    cmd_args.registry_hostname, cmd_args.service_account_json, cmd_args.project_id)
            except Exception as ex:
                print("Error: {}\n".format(ex))
                arg_parser.print_help()
        elif registry_type == REGISTRY_TYPE_JFROG:
            jfrog_args = arg_parser.add_argument_group('jfrog arguments')
            jfrog_args.add_argument("--jfrog_registry_url", metavar="jfrog_registry_url", required=True,
                                    type=str, help="JFrog registry url")
            jfrog_args.add_argument("--jfrog_repository", metavar="jfrog_repository", required=True,
                                    type=str, help="JFrog repository. e.g. docker")
            jfrog_args.add_argument("--jfrog_username", metavar="jfrog_username",
                                    type=str, required=True, help="JFrog username")
            jfrog_args.add_argument("--jfrog_password", metavar="jfrog_password",
                                    type=str, required=True, help="JFrog password")
            cmd_args = arg_parser.parse_args()
            try:
                registry_scanner = CveScanJfrogRegistryImages(
                    cmd_args.jfrog_registry_url, cmd_args.jfrog_repository, cmd_args.jfrog_username,
                    cmd_args.jfrog_password)
            except Exception as ex:
                print("Error: {}\n".format(ex))
                arg_parser.print_help()
        else:
            print("Error: Unknown registry_type {0}".format(registry_type))
            arg_parser.print_help()
    if registry_scanner:
        registry_scanner.scan_type = cmd_args.scan_type
        registry_scanner.mgmt_console_url = cmd_args.mgmt_console_url
        registry_scanner.scan_id = cmd_args.scan_id
        registry_scanner.deepfence_key = cmd_args.deepfence_key
        registry_scanner.update_dependency_data = cmd_args.update_dependency_data
        registry_scanner.is_image_local = cmd_args.is_image_local
        registry_scanner.validate()
        registry_scanner.docker_login()
        images_list = registry_scanner.get_images_list(cmd_args.image_name, cmd_args.image_tag,
                                                       cmd_args.image_name_with_tag, cmd_args.past_days)
        images_list = registry_scanner.user_select_images(
            images_list, is_interactive)
        registry_scanner.pull_images(images_list)
        registry_scanner.scan_images(images_list)
        registry_scanner.delete_images(images_list)


if __name__ == '__main__':
    main()
