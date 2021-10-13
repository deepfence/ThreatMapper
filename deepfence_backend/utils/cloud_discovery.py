import json
import os
import subprocess

from utils.constants import CLOUD_AZURE, CLOUD_GCP, CLOUD_AWS, STEAMPIPE_TABLES, CLOUD_VM, CLOUD_LB, CLOUD_USER
import requests


class CloudDiscovery:
    def __init__(self, cloud_provider, credentials=None, region=None):
        if not cloud_provider:
            return
        self.cloud_provider = cloud_provider
        if self.cloud_provider == CLOUD_AWS:
            os.environ["AWS_DEFAULT_REGION"] = "us-east-1"
        elif self.cloud_provider == CLOUD_GCP:
            project_id = ""
            try:
                project_id = requests.get("http://metadata.google.internal/computeMetadata/v1/project/project-id",
                                          headers={"Metadata-Flavor": "Google"}, timeout=1).text
            except:
                pass
            os.environ["CLOUDSDK_CORE_PROJECT"] = project_id
        elif self.cloud_provider == CLOUD_AZURE:
            if not credentials:
                os.environ["AZURE_USE_MSI"] = "1"
            subscription_id = ""
            try:
                subscription_id = requests.get(
                    "http://169.254.169.254/metadata/instance/compute/subscriptionId?api-version=2020-10-01&format=text",
                    headers={"Metadata": "true"}, timeout=1).text
            except:
                pass
            os.environ["AZURE_SUBSCRIPTION_ID"] = subscription_id
        if credentials:
            if self.cloud_provider == CLOUD_AWS:
                os.environ["AWS_ACCESS_KEY_ID"] = credentials['access_key']
                os.environ["AWS_SECRET_ACCESS_KEY"] = credentials['secret_key']
            elif self.cloud_provider == CLOUD_GCP:
                self.account_id = credentials['project_id']
                os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = credentials['secret_key']
            elif self.cloud_provider == CLOUD_AZURE:
                os.environ["AZURE_TENANT_ID"] = credentials['tenant_id']
                os.environ["AZURE_SUBSCRIPTION_ID"] = credentials['subscription_id']
                os.environ["AZURE_CLIENT_ID"] = credentials['key']
                os.environ["AZURE_CLIENT_SECRET"] = credentials['secret']
        if region:
            self.region = region
        try:
            self.table_prefix = {CLOUD_AWS: "aws_", CLOUD_GCP: "gcp_", CLOUD_AZURE: "azure_"}.get(
                cloud_provider, "")
        except Exception as ex:
            print(ex)

    def list_vms(self):
        table_name = self.table_prefix + STEAMPIPE_TABLES.get(CLOUD_VM).get(self.cloud_provider)[0]
        output_json = self.execute_steampipe_query(table=table_name)
        return output_json

    def list_nodes(self, node_type=None):
        if not node_type:
            return {}
        if node_type == CLOUD_LB:
            return self.list_load_balancers()
        elif node_type == CLOUD_USER:
            return self.list_users()
        else:
            table_names = map(lambda x: self.table_prefix + x, STEAMPIPE_TABLES.get(node_type, {})
                              .get(self.cloud_provider, []))
            output_json = {}
            for table_name in table_names:
                output_json[table_name] = self.execute_steampipe_query(table=table_name)
            return output_json

    def list_load_balancers(self):
        table_names = map(lambda x: self.table_prefix + x, STEAMPIPE_TABLES.get(CLOUD_LB, {})
                          .get(self.cloud_provider, []))
        output_json = {}
        if self.cloud_provider == CLOUD_GCP:
            output_json[self.table_prefix + CLOUD_LB] = self.execute_gcp_lb_steampipe_query()
        else:
            for table_name in table_names:
                output_json[table_name] = self.execute_steampipe_query(table=table_name)
        return output_json

    def execute_steampipe_query(self, table=None, columns=None):
        if not table:
            return []
        if not columns:
            columns = "*"
        if columns is list:
            columns = columns.join(",")
        out = subprocess.check_output(['steampipe', 'query', '--output', 'json',
                                       'select {} from {};'.format(columns, table)])
        try:
            j = json.loads(out)
        except Exception as ex:
            print("Execution error in {} query:".format(table))
            print(ex)
            return []
        return j

    def execute_gcp_lb_steampipe_query(self):
        query = """
            select lb.project as project_id,
                lb.name as name,
                bs.name as backend_service_name,
                bs.load_balancing_scheme as lb_scheme_type,
                thp.name as thp_name,
                fr.ip_address as lb_external_ip
            from gcp_compute_url_map lb
            inner join gcp_compute_backend_service bs
            on lb.default_service_name = bs.name
            inner join gcp_compute_target_https_proxy thp
            on thp.url_map = lb.self_link
            inner join gcp_compute_forwarding_rule fr
            on thp.self_link = split_part(fr.target, '/', 10);
        """
        out = subprocess.check_output(['steampipe', 'query', '--output', 'json', query])
        try:
            j = json.loads(out)
        except Exception as ex:
            print("Execution error in load balancer query:")
            print(ex)
            return []
        return j

    def list_users(self):
        table_names = map(lambda x: self.table_prefix + x, STEAMPIPE_TABLES.get(CLOUD_USER, {})
                          .get(self.cloud_provider, []))
        output_json = {}
        if self.cloud_provider == CLOUD_GCP:
            output_json[self.table_prefix + CLOUD_USER] = self.execute_gcp_users_query()
        else:
            for table_name in table_names:
                output_json[table_name] = self.execute_steampipe_query(table=table_name)
        return output_json

    def execute_gcp_users_query(self):
        query = """
            select
                entity,
                p ->> 'role' as role
            from
                gcp_iam_policy,
                jsonb_array_elements(bindings) as p,
                jsonb_array_elements_text(p -> 'members') as entity
            where entity LIKE 'user:%';
        """
        out = subprocess.check_output(['steampipe', 'query', '--output', 'json', query])
        try:
            j = json.loads(out)
        except Exception as ex:
            print("Execution error in user query:")
            print(ex)
            return []
        return j
