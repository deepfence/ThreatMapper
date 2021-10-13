import logging
from pathlib import Path

import requests

from . import AbstractProvider


class DOProvider(AbstractProvider):
    """
        Concrete implementation of the Digital Ocean cloud provider.
    """

    def __init__(self, logger=None):
        self.logger = logger or logging.getLogger(__name__)
        self.metadata_url = 'http://169.254.169.254/metadata/v1.json'
        self.vendor_file = '/sys/class/dmi/id/sys_vendor'

    def identify(self):
        """
            Tries to identify DO using all the implemented options
        """
        self.logger.info('Try to identify DO')
        return self.check_metadata_server() or self.check_vendor_file()

    def check_metadata_server(self):
        """
            Tries to identify DO via metadata server
        """
        self.logger.debug('Checking DO metadata')
        try:
            response = requests.get(self.metadata_url)
            if response.status_code != 200:
                return False
            if response.json()['droplet_id'] > 0:
                return True
            return False
        except BaseException:
            return False

    def check_vendor_file(self):
        """
            Tries to identify DO provider by reading the /sys/class/dmi/id/sys_vendor
        """
        self.logger.debug('Checking DO vendor file')
        do_path = Path(self.vendor_file)
        if do_path.is_file():
            if 'DigitalOcean' in open(self.vendor_file).read():
                return True
        return False
