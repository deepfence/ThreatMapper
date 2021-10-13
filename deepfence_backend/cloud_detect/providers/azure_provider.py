import logging
from pathlib import Path

import requests

from . import AbstractProvider


class AzureProvider(AbstractProvider):
    """
        Concrete implementation of the Azure cloud provider.
    """

    def __init__(self, logger=None):
        self.logger = logger or logging.getLogger(__name__)
        self.metadata_url = 'http://169.254.169.254/metadata/instance?api-version=2020-09-01'
        self.vendor_file = '/sys/class/dmi/id/sys_vendor'
        self.headers = {'Metadata': 'true'}

    def identify(self):
        """
            Tries to identify Azure using all the implemented options
        """
        self.logger.info('Try to identify DO')
        return self.check_metadata_server() or self.check_vendor_file()

    def check_metadata_server(self):
        """
            Tries to identify Azure via metadata server
        """
        self.logger.debug('Checking Azure metadata')
        try:
            response = requests.get(
                self.metadata_url,
                headers=self.headers,
            )
            if response.status_code != 200:
                return False
            return True
        except BaseException:
            return False

    def check_vendor_file(self):
        """
            Tries to identify Azure provider by reading the /sys/class/dmi/id/sys_vendor
        """
        self.logger.debug('Checking Azure vendor file')
        do_path = Path(self.vendor_file)
        if do_path.is_file():
            if 'Microsoft Corporation' in open(self.vendor_file).read():
                return True
        return False
