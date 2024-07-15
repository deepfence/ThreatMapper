import {
  ModelBenchmarkType,
  ModelCloudComplianceStatusEnum,
  ModelComplianceStatusEnum,
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

type SeverityKeyType = keyof typeof SeverityEnum;
export type SeverityValueType = (typeof SeverityEnum)[SeverityKeyType];

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
    case ModelBenchmarkType.AwsFoundationalSecurity:
      return 'AWS Foundational Security';

    default:
      // eslint-disable-next-line no-case-declarations
      const _exhaustiveCheck: never = backendBenchmark;
      throw new Error(`Unhandled case: ${_exhaustiveCheck}`);
  }
}

export function getPostureStatusPrettyName(
  status: ModelCloudComplianceStatusEnum | ModelComplianceStatusEnum,
) {
  switch (status) {
    case ModelCloudComplianceStatusEnum.Alarm:
      return 'Alarm';
    case ModelCloudComplianceStatusEnum.Info:
      return 'Info';
    case ModelCloudComplianceStatusEnum.Ok:
      return 'Ok';
    case ModelCloudComplianceStatusEnum.Skip:
      return 'Skip';
    case ModelCloudComplianceStatusEnum.Delete:
      return 'Delete';
    case ModelComplianceStatusEnum.Pass:
      return 'Pass';
    case ModelComplianceStatusEnum.Warn:
      return 'Warn';
    case ModelComplianceStatusEnum.Note:
      return 'Note';

    default:
      // eslint-disable-next-line no-case-declarations
      const _exhaustiveCheck: never = status;
      throw new Error(`Unhandled case: ${_exhaustiveCheck}`);
  }
}

export function getSeverityPrettyName(severity: SeverityValueType) {
  switch (severity) {
    case SeverityEnum.Critical:
      return 'Critical';
    case SeverityEnum.High:
      return 'High';
    case SeverityEnum.Medium:
      return 'Medium';
    case SeverityEnum.Low:
      return 'Low';
    case SeverityEnum.Unknown:
      return 'Unknown';

    default:
      // eslint-disable-next-line no-case-declarations
      const _exhaustiveCheck: never = severity;
      throw new Error(`Unhandled case: ${_exhaustiveCheck}`);
  }
}

export function getMaskedUnmaskedPrettyName(maskedUnmasked: string) {
  switch (maskedUnmasked) {
    case 'masked':
      return 'Masked';
    case 'unmasked':
      return 'Unmasked';

    default:
      throw new Error(
        `Unhandled case: No matching key found for getMaskedUnmaskedPrettyName`,
      );
  }
}
