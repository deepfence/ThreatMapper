import datetime
import click
from models.user import Role, User, Company
from models.df_cluster import DFCluster
from uuid import getnode
from utils.constants import USER_ROLES


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
