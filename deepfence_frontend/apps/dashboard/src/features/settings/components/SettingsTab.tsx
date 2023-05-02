import {
  HiClock,
  HiCode,
  HiDocumentSearch,
  HiGlobeAlt,
  HiOutlineMail,
  HiUsers,
  HiViewList,
} from 'react-icons/hi';
import { Tabs } from 'ui-components';

import { usePageNavigation } from '@/utils/usePageNavigation';

type RouteProps =
  | 'diagnostic-logs'
  | 'user-management'
  | 'scan-history-and-db-management'
  | 'user-audit-logs'
  | 'email-configuration'
  | 'schedule-jobs'
  | 'scan-type-data-upload'
  | 'connection-instructions'
  | 'global-settings';
type SettingsTabProps = {
  children: React.ReactNode;
  value: RouteProps;
};
export const settingsTabs: Array<{
  label: string;
  value: RouteProps;
  icon?: React.ReactNode;
}> = [
  {
    label: 'User Management',
    value: 'user-management',
    icon: <HiUsers />,
  },
  {
    label: 'Scan History & Database Management',
    value: 'scan-history-and-db-management',
    icon: <HiClock />,
  },
  {
    label: 'Diagnostic Logs',
    value: 'diagnostic-logs',
    icon: <HiDocumentSearch />,
  },
  {
    label: 'User Audit Logs',
    value: 'user-audit-logs',
    icon: <HiViewList />,
  },
  {
    label: 'Email Configuration',
    value: 'email-configuration',
    icon: <HiOutlineMail />,
  },
  // {
  //   label: 'Schedule Jobs',
  //   value: 'schedule-jobs',
  //   icon: <HiUsers />,
  // },
  // {
  //   label: 'Scan Type Feed Data',
  //   value: 'scan-type-data-upload',
  //   icon: <HiUsers />,
  // },
  {
    label: 'Global Settings',
    value: 'global-settings',
    icon: <HiGlobeAlt />,
  },
  {
    label: 'Connection Instructions',
    value: 'connection-instructions',
    icon: <HiCode />,
  },
];

export const SettingsTab = ({ children, value }: SettingsTabProps) => {
  const { navigate } = usePageNavigation();

  return (
    <Tabs
      tabs={settingsTabs}
      value={value}
      size="xs"
      className="mt-1 px-2"
      onValueChange={(value) => {
        navigate(`/settings/${value}`);
      }}
    >
      {children}
    </Tabs>
  );
};
