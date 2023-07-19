from models.user import Role, User, Company
from models.df_cluster import DFCluster
from uuid import getnode
from utils.constants import USER_ROLES, SBOM_INDEX
from utils.common import password_policy_check
from utils.esconn import ESConn
import json
import time
import click
from utils.helper import mkdir_recursive


@click.command("initialize")
def initialize():
    # Initialize roles.
    print("Creating user roles")
    user_roles = Role.query.all()
    user_role_names = [role.name for role in user_roles]
    if USER_ROLES.ADMIN_USER not in user_role_names:
        admin_role = Role(name=USER_ROLES.ADMIN_USER)
        admin_role.save()
    if USER_ROLES.NORMAL_USER not in user_role_names:
        user_role = Role(name=USER_ROLES.NORMAL_USER)
        user_role.save()
    if USER_ROLES.READ_ONLY_USER not in user_role_names:
        user_role = Role(name=USER_ROLES.READ_ONLY_USER)
        user_role.save()

    if DFCluster.query.count() == 0:
        df_cluster_id = getnode()
        print('Created df_cluster_id {}'.format(df_cluster_id))
        df_cluster = DFCluster(id=df_cluster_id)
        df_cluster.save()

    print("Finished creating user roles")


@click.command("reset-password")
@click.option('--email', prompt="Enter your email address", help='registered email address')
@click.option('--password', prompt="Enter new password", help='new password', hide_input=True, confirmation_prompt=True)
def reset_password(email, password):
    email = str(email).strip()
    if not email:
        print("email is required")
        return
    password = str(password).strip()
    if not password:
        print("password is required")
        return
    user = User.query.filter_by(email=email).one_or_none()
    if not user:
        print("No user found with entered email address")
        return
    is_password_valid, msg = password_policy_check(password)
    if not is_password_valid:
        print(msg)
        return
    user.set_password(password)
    user.password_invalidated = False
    user.save()
    print("Password successfully changed")


@click.command("migrate-sbom-es-index")
def migrate_sbom_es_index():
    try:
        try:
            mapping = ESConn.get_mapping(index=SBOM_INDEX)
        except Exception as ex:
            print(ex)
            return

        artifacts = mapping.get(SBOM_INDEX, {}).get('mappings', {}).get('properties', {}).get('artifacts', {})
        if not artifacts:
            print("SBOM elasticsearch index migration already complete")
            return

        bkp_filename = "/data/sbom.json"
        mkdir_recursive("/data")
        bkp_file = open(bkp_filename, 'w')
        corrected_count = 0
        default_count = 0
        total_docs = 0
        while True:
            try:
                print('Elasticsearch Health check in progress')
                health = ESConn.health(index=SBOM_INDEX, wait_for_status='yellow', timeout='180s')
                if health.get('status') in ['green', 'yellow']:
                    print('Elasticsearch health green/yellow')
                    break
            except Exception:
                pass

        try:
            for total_pages, page_count, page_items, page_data in ESConn.scroll(SBOM_INDEX, {}, page_size=5):
                if not page_data:
                    break
                total_docs += page_data["hits"]["total"]["value"]
                for doc in page_data.get("hits", {}).get("hits", []):
                    doc_source = doc.get('_source')
                    source = {}
                    if "source" in doc_source:
                        source = doc_source.get("source", {})
                    elif "source_host" in doc_source:
                        source = doc_source.get("source_host", {})
                    doc_source["sbom"] = {
                        "artifacts": doc_source.get("artifacts", []),
                        "distro": doc_source.get("distro", {}),
                        "source": source,
                        "schema": {
                            "url": "https://raw.githubusercontent.com/anchore/syft/main/schema/json/schema-6.0.0.json",
                            "version": "6.0.0"
                        }
                    }
                    del doc_source["artifacts"]
                    del doc_source["distro"]
                    if "source" in doc_source:
                        del doc_source["source"]
                    if "source_host" in doc_source:
                        del doc_source["doc_source"]
                    bkp_file.write(json.dumps({
                        "_id": doc.get('_id'),
                        "_index": doc.get('_index'),
                        "_source": doc_source,
                    }) + "\n")
        except Exception as e:
            print('Something went wrong while migrating SBOM es index. Error: {}'.format(e))
            bkp_file.close()
            return
        finally:
            bkp_file.close()

        print('Backed up {} documents; corrected: {}, default: {}'.format(total_docs, corrected_count, default_count))

        ESConn.delete_index(SBOM_INDEX)
        print("Deleted current {0} index".format(SBOM_INDEX))
        time.sleep(5)

        mapping = {
            "properties": {
                "@timestamp": {"type": "date"},
                "sbom": {"type": "object", "enabled": False},
                "scan_id": {"type": "text", "fields": {"keyword": {"type": "keyword", "ignore_above": 256}}},
                "node_id": {"type": "text", "fields": {"keyword": {"type": "keyword", "ignore_above": 256}}},
                "time_stamp": {"type": "long"}
            }
        }
        ESConn.create_index(index=SBOM_INDEX)
        ESConn.put_mapping(index=SBOM_INDEX, mapping=mapping)

        bkp_file = open(bkp_filename, 'r')
        bulk_es_query = []
        counter = 0
        while True:
            line = bkp_file.readline()
            if not line:
                break
            doc = json.loads(line)
            bulk_es_query.append(json.dumps({"index": {"_index": doc.get("_index"), "_id": doc.get("_id")}}))
            bulk_es_query.append(json.dumps(doc.get('_source')))
            counter += 1
            if counter % 5 == 0:
                ESConn.bulk_query('', bulk_es_query, refresh="wait_for")
                bulk_es_query = []
        if bulk_es_query:
            ESConn.bulk_query('', bulk_es_query, refresh="wait_for")
        print("SBOM elasticsearch index migration complete")
    except Exception as e:
        print('Something went wrong while migrating SBOM es index. Error: {}'.format(e))
