import fs from 'fs';
import path from 'path';
import * as prettier from 'prettier';

(async () => {
  const apiSpec = JSON.parse(
    fs.readFileSync(path.resolve('./api-spec-original.json'), 'utf8'),
  );

  // BEGIN: Transform UtilsReportFilters node_type
  delete apiSpec.components.schemas.UtilsReportFilters.properties.node_type.items.type;
  apiSpec.components.schemas.UtilsReportFilters.properties.node_type.items.enum =
    apiSpec.components.schemas.UtilsReportFilters.properties.node_type.enum;
  delete apiSpec.components.schemas.UtilsReportFilters.properties.node_type.enum;
  // END

  // BEGIN INGEST API ISSUE FIXES
  const routes = [
    '/deepfence/ingest/cloud-resources',
    '/deepfence/ingest/cloud-compliance-status',
    '/deepfence/ingest/cloud-compliance',
    '/deepfence/ingest/compliance-scan-logs',
    '/deepfence/ingest/compliance',
    '/deepfence/ingest/malware',
    '/deepfence/ingest/malware-scan-logs',
    '/deepfence/ingest/secret-scan-logs',
    '/deepfence/ingest/secrets',
    '/deepfence/ingest/vulnerabilities',
    '/deepfence/ingest/vulnerabilities-scan-logs',
  ];

  routes.forEach((route) => {
    delete apiSpec.paths[route];
  });

  // END

  const prettierrc = fs.readFileSync(path.resolve('./../../.prettierrc.json'), 'utf-8');
  const fileContent = await prettier.format(JSON.stringify(apiSpec), {
    ...JSON.parse(prettierrc),
    parser: 'json',
  });
  fs.writeFileSync(path.resolve('./api-spec.json'), fileContent, 'utf8');
})();
