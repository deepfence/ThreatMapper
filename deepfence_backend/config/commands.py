import click
from models.user import Role, User, Company
from models.df_cluster import DFCluster
from uuid import getnode
from utils.constants import USER_ROLES
from utils.common import password_policy_check


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
