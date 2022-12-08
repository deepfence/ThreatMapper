// TODO: see if this is released https://github.com/OpenAPITools/openapi-generator/pull/13825
// otherwilse there is a bug which needs some manual fixes everytime we regenerate

import { AuthenticationApi, Configuration } from './generated';

const configuration = new Configuration({
  basePath: `${window.location.protocol}//${window.location.host}`,
});

export const authenticationApi = new AuthenticationApi(configuration);
