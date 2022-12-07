import { AuthenticationApi, Configuration } from './generated';

const configuration = new Configuration({
  basePath: `${window.location.protocol}//${window.location.host}`,
});

export const authenticationApi = new AuthenticationApi(configuration);
