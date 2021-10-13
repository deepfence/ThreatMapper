import logging
from pathlib import Path

import requests

from . import AbstractProvider


class AWSProvider(AbstractProvider):
    """
        Concrete implementation of the AWS cloud provider.
    """

    def __init__(self, logger=None):
        self.logger = logger or logging.getLogger(__name__)
        self.metadata_url = 'http://169.254.169.254/latest/dynamic/instance-identity/document'
        self.vendor_file = '/sys/class/dmi/id/sys_vendor'
        self.vendor_version_file = '/sys/class/dmi/id/product_version'

    def identify(self):
        """
            Tries to identify AWS using all the implemented options
        """
        self.logger.info('Try to identify AWS')
        return self.check_metadata_server() or self.check_vendor_file()

    def check_metadata_server(self):
        """
            Tries to identify AWS via metadata server
        """
        self.logger.debug('Checking AWS metadata')
        try:
            response = requests.get(self.metadata_url)
            if response.status_code != 200:
                return False
            response = response.json()
            if response['imageId'].startswith('ami-') and response['instanceId'].startswith('i-'):
                return True
            return False
        except BaseException:
            return False

    def check_vendor_file(self):
        """
            Tries to identify AWS provider by reading the /sys/class/dmi/id/product_version
        """
        self.logger.debug('Checking AWS vendor file')
        aws_path = Path(self.vendor_file)
        if aws_path.is_file():
            if 'Amazon' in open(self.vendor_file).read():
                return True
            if 'amazon' in open(self.vendor_version_file).read():
                return True
        return False
