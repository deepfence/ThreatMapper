import logging
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.schema import UniqueConstraint
from config.app import db

from utils.custom_exception import DFError
from utils.resource import encrypt, decrypt
from cve_scan_registry.scan_registry.cve_scan_registry import CveScanECRImages, REGISTRY_TYPE_ECR, \
    CveScanDockerPrivateRegistryImages, CveScanHarborRegistryImages, REGISTRY_TYPE_DOCKER_PVT, REGISTRY_TYPE_HARBOR, \
    REGISTRY_TYPE_AZURE, CveScanAzureRegistryImages, REGISTRY_TYPE_DOCKER_HUB, CveScanDockerHubImages, \
    REGISTRY_TYPE_QUAY, CveScanQuayRegistryImages, REGISTRY_TYPE_GITLAB, CveScanGitlabRegistryImages, \
    REGISTRY_TYPE_GCLOUD, CveScanGoogleRegistryImages, REGISTRY_TYPE_JFROG, CveScanJfrogRegistryImages

logging.basicConfig(level=logging.ERROR)


class RegistryCredential(db.Model):
    """
    RegistryCredential stores the cloud registry credentials in encrypted format.
    Fields like username, registry URL etc. are not senstive and its stored in plain text.
    Sensistive fields like passwords, ACCESS KEYS are stored in a separate field in encrypted format
    The sensistive field needs to be read/written using the "secret" setter and getter properties.
    """
    created_at = db.Column(db.DateTime(timezone=True), default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), default=func.now(), onupdate=func.now())
    id = db.Column(db.Integer, primary_key=True)

    name = db.Column(db.String(1024), nullable=False)
    registry_type = db.Column(db.String(64), nullable=False)
    _encrypted_secret = db.Column(JSONB, nullable=False)
    _non_secret = db.Column(JSONB, nullable=False)
    _extras = db.Column(JSONB, nullable=True)

    __table_args__ = (UniqueConstraint('registry_type', '_encrypted_secret', '_non_secret',
                                       name='registry_credential_uniqueness'),)

    fields = {
        REGISTRY_TYPE_DOCKER_PVT: ["docker_registry_url", "docker_username", "docker_password"],
        REGISTRY_TYPE_DOCKER_HUB: ["docker_hub_namespace", "docker_hub_username", "docker_hub_password"],
        REGISTRY_TYPE_QUAY: ["quay_registry_url", "quay_namespace", "quay_access_token"],
        REGISTRY_TYPE_ECR: ["aws_access_key_id", "aws_secret_access_key", "aws_region_name", "registry_id",
                            "use_iam_role", "target_account_role_arn"],
        REGISTRY_TYPE_HARBOR: ["harbor_registry_url", "harbor_username", "harbor_password"],
        REGISTRY_TYPE_AZURE: ["azure_registry_url", "azure_registry_username", "azure_registry_password"],
        REGISTRY_TYPE_GITLAB: ["gitlab_server_url", "gitlab_registry_url", "gitlab_access_token"],
        REGISTRY_TYPE_GCLOUD: ["service_account_json", "registry_hostname", "project_id"],
        REGISTRY_TYPE_JFROG: ["jfrog_registry_url", "jfrog_repository", "jfrog_username", "jfrog_password"],
    }
    non_mandatory_fields = {
        REGISTRY_TYPE_DOCKER_PVT: [],
        REGISTRY_TYPE_DOCKER_HUB: [],
        REGISTRY_TYPE_QUAY: ["quay_access_token"],
        REGISTRY_TYPE_ECR: ["aws_access_key_id", "aws_secret_access_key", "registry_id", "target_account_role_arn"],
        REGISTRY_TYPE_HARBOR: [],
        REGISTRY_TYPE_AZURE: [],
        REGISTRY_TYPE_GITLAB: [],
        REGISTRY_TYPE_GCLOUD: [],
        REGISTRY_TYPE_JFROG: [],
    }

    clients = {
        REGISTRY_TYPE_DOCKER_PVT: CveScanDockerPrivateRegistryImages,
        REGISTRY_TYPE_DOCKER_HUB: CveScanDockerHubImages,
        REGISTRY_TYPE_QUAY: CveScanQuayRegistryImages,
        REGISTRY_TYPE_ECR: CveScanECRImages,
        REGISTRY_TYPE_HARBOR: CveScanHarborRegistryImages,
        REGISTRY_TYPE_AZURE: CveScanAzureRegistryImages,
        REGISTRY_TYPE_GITLAB: CveScanGitlabRegistryImages,
        REGISTRY_TYPE_GCLOUD: CveScanGoogleRegistryImages,
        REGISTRY_TYPE_JFROG: CveScanJfrogRegistryImages,
    }

    def __init__(self, name=None, registry_type=None, non_secret=None, secret=None, extras=None):
        if not secret:
            secret = {}
        if not non_secret:
            non_secret = {}
        if not extras:
            extras = {}
        if not name:
            raise DFError("Registry name is mandatory")
        if not registry_type:
            raise DFError("Registry type is mandatory")
        if not non_secret:
            # Rational behind actual error and user friendly error message.
            # The form shown to user and the way its stored is different.
            # The validating API can send the friendly message to user,
            # while the actual error can used for logging, for debugging.
            actual_error = DFError("non_secret is mandatory")
            raise DFError("Invalid credentials", error=actual_error)
        if type(non_secret) != dict:
            actual_error = DFError("non_secret should be of type dict")
            raise DFError("Invalid credentials", error=actual_error)
        if len(non_secret) == 0:
            actual_error = DFError("non_secret cannot be empty")
            raise DFError("Invalid credentials", error=actual_error)
        # if not secret:
        # actual_error = DFError("secret is mandatory")
        # raise DFError("Invalid credentials", error=actual_error)
        if type(secret) != dict:
            actual_error = DFError("secret should be of type dict")
            raise DFError("Invalid credentials", error=actual_error)
        # if len(secret) == 0:
        #     actual_error = DFError("secret cannot be empty")
        #     raise DFError("Invalid credentials", error=actual_error)
        if type(extras) != dict:
            actual_error = DFError("extras should be of type dict")
            raise DFError("Invalid credentials", error=actual_error)

        self.name = name
        self.registry_type = registry_type
        self.non_secret = non_secret
        self.secret = secret
        self.extras = extras
        self.basic_validation()

    def pretty_print(self):
        return {
            "created_at": str(self.created_at),
            "updated_at": str(self.updated_at),
            "id": self.id,
            "name": self.name,
            "registry_type": self.registry_type,
            "credentials": self._non_secret,
        }

    def basic_validation(self):
        credentials = self.credentials
        registry_type = self.registry_type

        all_fields = self.fields.get(registry_type, [])
        if len(all_fields) == 0:
            raise DFError("Invalid registry type {}".format(registry_type))
        non_mandatory_fields = self.non_mandatory_fields.get(registry_type, [])
        for field in all_fields:
            if field not in non_mandatory_fields:
                if credentials.get(field) is None or credentials.get(field) == "":
                    raise DFError("{} is mandatory".format(field))

    def initialize_client(self):
        # client initialization based on registry type
        registry_type = self.registry_type
        credentials = self.credentials
        if not registry_type:
            raise DFError("Invalid registry")
        if registry_type == REGISTRY_TYPE_DOCKER_PVT:
            self._client = CveScanDockerPrivateRegistryImages(credentials.get('docker_registry_url'),
                                                              credentials.get('docker_username'),
                                                              credentials.get('docker_password'))
        elif registry_type == REGISTRY_TYPE_DOCKER_HUB:
            self._client = CveScanDockerHubImages(credentials.get('docker_hub_namespace'),
                                                  credentials.get('docker_hub_username'),
                                                  credentials.get('docker_hub_password'))
        elif registry_type == REGISTRY_TYPE_QUAY:
            self._client = CveScanQuayRegistryImages(credentials.get('quay_registry_url'),
                                                     credentials.get('quay_namespace'),
                                                     credentials.get('quay_access_token', ""))
        elif registry_type == REGISTRY_TYPE_ECR:
            self._client = CveScanECRImages(credentials.get('aws_access_key_id'),
                                            credentials.get('aws_secret_access_key'),
                                            credentials.get('aws_region_name'),
                                            credentials.get('registry_id'),
                                            credentials.get('target_account_role_arn'),
                                            str(credentials.get('use_iam_role')).lower())
        elif registry_type == REGISTRY_TYPE_HARBOR:
            self._client = CveScanHarborRegistryImages(credentials.get('harbor_registry_url'),
                                                       credentials.get('harbor_username'),
                                                       credentials.get('harbor_password'))
        elif registry_type == REGISTRY_TYPE_AZURE:
            self._client = CveScanAzureRegistryImages(credentials.get('azure_registry_url'),
                                                      credentials.get('azure_registry_username'),
                                                      credentials.get('azure_registry_password'))
        elif registry_type == REGISTRY_TYPE_GITLAB:
            self._client = CveScanGitlabRegistryImages(credentials.get('gitlab_server_url'),
                                                       credentials.get('gitlab_registry_url'),
                                                       credentials.get('gitlab_access_token'))
        elif registry_type == REGISTRY_TYPE_GCLOUD:
            self._client = CveScanGoogleRegistryImages(credentials.get('registry_hostname'),
                                                       credentials.get('service_account_json'),
                                                       credentials.get('project_id'))
        elif registry_type == REGISTRY_TYPE_JFROG:
            self._client = CveScanJfrogRegistryImages(credentials.get('jfrog_registry_url'),
                                                      credentials.get('jfrog_repository'),
                                                      credentials.get('jfrog_username'),
                                                      credentials.get('jfrog_password'))
        else:
            raise DFError("Registry {} not supported".format(registry_type))

    def encrypt_secret(self, value):
        encrypted_secret = ""
        if type(value) == str and len(value) > 0:
            encrypted_secret = encrypt(value)
        return encrypted_secret

    def decrypt_secret(self, value):
        if type(value) == str and len(value) > 0:
            return decrypt(value)
        return ""

    @property
    def secret(self):
        """
        returns decrypted secret
        """
        decrypted_dict = {}
        for key, encrypted_value in self._encrypted_secret.items():
            decrypted_dict[key] = self.decrypt_secret(encrypted_value)

        return decrypted_dict

    @secret.setter
    def secret(self, value_dict):
        """
        Save plain text secret by encrypting it
        """
        if type(value_dict) != dict:
            raise DFError("secret value should be of type dict")

        # if len(value_dict) == 0:
        #     raise DFError("secret value dict cannot be empty")

        registry_type = self.registry_type
        allowed_fields = self.fields.get(registry_type, [])
        if len(allowed_fields) == 0:
            raise DFError("Invalid registry type {}".format(registry_type))

        encrypted_dict = {}
        for key, value in value_dict.items():
            if type(value) != str:
                raise DFError("{} value should be of type str")

            if len(value) == 0:
                raise DFError("{} value cannot be empty".format(key))

            if key in allowed_fields:
                encrypted_dict[key] = self.encrypt_secret(value)

        self._encrypted_secret = encrypted_dict

    @property
    def extras(self):
        decrypted_dict = {}
        if self._extras:
            for key, encrypted_value in self._extras.items():
                decrypted_dict[key] = self.decrypt_secret(encrypted_value)

        return decrypted_dict

    @extras.setter
    def extras(self, value_dict):
        if type(value_dict) != dict:
            raise DFError("extras value should be of type dict")
        registry_type = self.registry_type
        allowed_fields = self.fields.get(registry_type, [])

        encrypted_extras = {}
        for key, value in value_dict.items():
            if type(value) != str:
                raise DFError("{} value should be of type str")

            if len(value) == 0:
                raise DFError("{} value cannot be empty".format(key))

            if key in allowed_fields:
                encrypted_extras[key] = self.encrypt_secret(value)

        self._extras = encrypted_extras

    @property
    def non_secret(self):
        return self._non_secret

    @non_secret.setter
    def non_secret(self, value_dict):
        if type(value_dict) != dict:
            raise DFError("non_secret value should be of type dict")

        if len(value_dict) == 0:
            raise DFError("non_secret value dict cannot be empty")

        registry_type = self.registry_type
        allowed_fields = self.fields.get(registry_type, [])
        if len(allowed_fields) == 0:
            raise DFError("Invalid registry type {}".format(registry_type))

        sanitized_dict = {key: value for key, value in value_dict.items() if key in allowed_fields}
        self._non_secret = sanitized_dict

    @property
    def credentials(self):
        """
        return credentials which is merge of secret and non secret dict fields
        """
        decrypted_secret = self.secret
        decrypted_secret.update(self.non_secret)
        decrypted_extras = self.extras
        if decrypted_extras:
            decrypted_secret.update(decrypted_extras)
        return decrypted_secret

    @property
    def client(self):
        if not hasattr(self, '_client'):
            self.initialize_client()
        return self._client

    def save(self, commit=True, update=False):
        if not update:
            db.session.add(self)
        if commit:
            try:
                db.session.commit()
            except:
                db.session.rollback()

                # Exception block is just for rolling back the transaction
                # So re raise it.
                raise

    def delete(self, commit=True):
        db.session.delete(self)
        if commit:
            try:
                db.session.commit()
            except:
                db.session.rollback()

                # Exception block is just for rolling back the transaction
                # So re raise it.
                raise

    def __repr__(self):
        return "<RegistryCredential({}) {}>".format(self.registry_type, self.name)
