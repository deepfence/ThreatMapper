import CISSummary from './summary-cis';
import NSACISASummary from './summary-nsa-cisa';
import NISTSummary from './summary-nist';
import PCISummary from './summary-pci';
import HIPAASummary from './summary-hipaa';
import GdprSummary from './summary-gdpr';
import Soc2Summary from './summary-soc2';

export const AWSComplianceViewMenu = [
  {
    id: 'cis',
    displayName: 'CIS',
    component: CISSummary,
    link: '/compliance/cis',
  },
  {
    id: 'gdpr',
    displayName: 'GDPR',
    component: GdprSummary,
    link: '/compliance/gdpr',
  },
  {
    id: 'hipaa',
    displayName: 'HIPAA',
    component: HIPAASummary,
    link: '/compliance/hipaa',
  },
  {
    id: 'pci',
    displayName: 'PCI',
    component: PCISummary,
    link: '/compliance/pci',
  },
  {
    id: 'soc2',
    displayName: 'SOC2',
    component: Soc2Summary,
    link: '/compliance/soc2'
  },
  {
    id: 'nist',
    displayName: 'NIST',
    component: NISTSummary,
    link: '/compliance/nist',
  },
];

export const GCPComplianceViewMenu = [
  {
    id: 'cis',
    displayName: 'CIS',
    component: CISSummary,
    link: '/compliance/cis',
  },
];

export const AzureComplianceViewMenu = [
  {
    id: 'cis',
    displayName: 'CIS',
    component: CISSummary,
    link: '/compliance/cis',
  },
  {
    id: 'hipaa',
    displayName: 'HIPAA',
    component: HIPAASummary,
    link: '/compliance/hipaa',
  },
  {
    id: 'nist',
    displayName: 'NIST',
    component: NISTSummary,
    link: '/compliance/nist',
  },
];


export const KubernetesComplianceViewMenu = [
  {
    id: 'nsa-cisa',
    displayName: 'NSA & CISA',
    component: NSACISASummary,
    link: '/compliance/nsa-cisa',
  },
];


export const LinuxComplianceViewMenu = [
  {
    id: 'hipaa',
    displayName: 'HIPAA',
    component: HIPAASummary,
    link: '/compliance/hipaa',
  },
  {
    id: 'gdpr',
    displayName: 'GDPR',
    component: GdprSummary,
    link: '/compliance/gdpr',
  },
  {
    id: 'pci',
    displayName: 'PCI',
    component: PCISummary,
    link: '/compliance/pci',
  },
  {
    id: 'nist',
    displayName: 'NIST',
    component: NISTSummary,
    link: '/compliance/nist',
  },
];

export const complianceViewMenuIndex = AWSComplianceViewMenu.reduce((acc, el) => {
  acc[el.id] = el;
  return acc;
}, {});
