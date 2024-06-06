import {
  ModelBenchmarkType,
  ModelMalwareFileSeverityEnum,
  ModelSecretLevelEnum,
  ModelVulnerabilityCveSeverityEnum,
} from '@/api/generated';

export const SeverityEnum = {
  ...ModelSecretLevelEnum,
  ...ModelVulnerabilityCveSeverityEnum,
  ...ModelMalwareFileSeverityEnum,
} as const;

export const SeverityEnumList = [
  SeverityEnum.Critical,
  SeverityEnum.High,
  SeverityEnum.Medium,
  SeverityEnum.Low,
  SeverityEnum.Unknown,
] as const;
export function getBenchmarkPrettyName(backendBenchmark: ModelBenchmarkType) {
  switch (backendBenchmark) {
    case ModelBenchmarkType.Cis:
      return 'CIS';
    case ModelBenchmarkType.Nist:
      return 'NIST';
    case ModelBenchmarkType.Pci:
      return 'PCI';
    case ModelBenchmarkType.Hipaa:
      return 'HIPPA';
    case ModelBenchmarkType.Soc2:
      return 'SOC2';
    case ModelBenchmarkType.Gdpr:
      return 'GDPR';
    case ModelBenchmarkType.NsaCisa:
      return 'NSA-CISA';

    default:
      // eslint-disable-next-line no-case-declarations
      const _exhaustiveCheck: never = backendBenchmark;
      throw new Error(`Unhandled case: ${_exhaustiveCheck}`);
  }
}
