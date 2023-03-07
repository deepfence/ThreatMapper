import * as NavigationMenu from '@radix-ui/react-navigation-menu';
import classNames from 'classnames';
import { forwardRef, ReactNode, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { twMerge } from 'tailwind-merge';
import { Tooltip } from 'ui-components';

import { DashboardIcon } from '@/components/sideNavigation/icons/Dashboard';
import { IntegrationsIcon } from '@/components/sideNavigation/icons/Integrations';
import { MalwareIcon } from '@/components/sideNavigation/icons/Malware';
import { PostureIcon } from '@/components/sideNavigation/icons/Posture';
import { RegistryIcon } from '@/components/sideNavigation/icons/Registry';
import { SecretsIcon } from '@/components/sideNavigation/icons/Secrets';
import { SettingsIcon } from '@/components/sideNavigation/icons/Settings';
import { ThreatGraphIcon } from '@/components/sideNavigation/icons/ThreatGraph';
import { TopologyIcon } from '@/components/sideNavigation/icons/Topology';
import { VulnerabilityIcon } from '@/components/sideNavigation/icons/Vulnerability';

export interface SideNavigationRootProps {
  expanded?: boolean;
}

const MenuItems: Array<{
  title: string;
  Icon: () => JSX.Element;
  to: string;
}> = [
  {
    title: 'Dashboard',
    Icon: DashboardIcon,
    to: '/dashboard',
  },
  {
    title: 'Topology',
    Icon: TopologyIcon,
    to: '/topology',
  },
  {
    title: 'ThreatGraph',
    Icon: ThreatGraphIcon,
    to: '/threatgraph',
  },
  {
    title: 'Vulnerabilities',
    Icon: VulnerabilityIcon,
    to: '/vulnerability',
  },
  {
    title: 'Secrets',
    Icon: SecretsIcon,
    to: '/secret',
  },
  {
    title: 'Malwares',
    Icon: MalwareIcon,
    to: '/malware',
  },
  {
    title: 'Posture',
    Icon: PostureIcon,
    to: '/posture',
  },
  {
    title: 'Registries',
    Icon: RegistryIcon,
    to: '/registries',
  },
  {
    title: 'Integrations',
    Icon: IntegrationsIcon,
    to: '/integrations',
  },
  {
    title: 'Settings',
    Icon: SettingsIcon,
    to: '/settings',
  },
];

const ItemWrapper = forwardRef(
  (
    {
      expanded,
      title,
      children,
    }: {
      expanded?: boolean;
      title: string;
      children: ReactNode;
    },
    _,
  ) => {
    if (expanded) return <div>{children}</div>;
    return (
      <Tooltip placement="right" content={title} triggerAsChild>
        <div tabIndex={-1}>{children}</div>
      </Tooltip>
    );
  },
);

export function SideNavigation({ expanded }: SideNavigationRootProps) {
  useEffect(() => {
    setSideNavigationState(expanded ? 'open' : 'closed');
  }, [expanded]);
  return (
    <NavigationMenu.Root
      orientation="vertical"
      className={classNames(
        'overflow-x-hidden overflow-y-auto shrink-0',
        'bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700',
        'transition-[width]',
        'sticky left-0 top-[64px] scrolling-touch',
        {
          ['p-3']: expanded,
          ['px-2.5 py-3']: !expanded,
        },
      )}
      style={{
        width: expanded ? '240px' : '60px',
        height: 'calc(100vh - 64px)',
      }}
    >
      <NavigationMenu.List className={classNames('flex flex-col gap-1.5')}>
        {MenuItems.map((menuItem) => {
          const linkClass = classNames(
            'text-base font-medium text-gray-900 dark:text-white rounded-xl p-2 block',
            'hover:bg-gray-100 dark:hover:bg-gray-700',
            'flex gap-3 whitespace-nowrap',
            'group',
            'focus:outline-none focus:ring-1 focus:ring-blue-400 dark:focus:ring-blue-700',
            {
              ['w-fit']: !expanded,
            },
          );

          return (
            <NavigationMenu.Item key={menuItem.title}>
              <NavigationMenu.Link asChild>
                <ItemWrapper expanded={expanded} title={menuItem.title}>
                  <NavLink
                    to={menuItem.to}
                    className={({ isActive }) =>
                      isActive
                        ? twMerge(
                            linkClass,
                            'bg-gray-100 dark:bg-gray-700 text-blue-600 dark:text-blue-500',
                          )
                        : linkClass
                    }
                  >
                    {({ isActive }) => {
                      return (
                        <>
                          <div
                            className={twMerge(
                              classNames(
                                'w-6 h-6 group-hover:text-gray-900 dark:group-hover:text-white shrink-0',
                                {
                                  ['text-blue-600 dark:text-blue-500 group-hover:text-blue-600 dark:group-hover:text-blue-500']:
                                    isActive,
                                  ['text-gray-500 dark:text-gray-400']: !isActive,
                                },
                              ),
                            )}
                          >
                            <menuItem.Icon />
                          </div>
                          {expanded && (
                            <div className="overflow-hidden flex-1">{menuItem.title}</div>
                          )}
                        </>
                      );
                    }}
                  </NavLink>
                </ItemWrapper>
              </NavigationMenu.Link>
            </NavigationMenu.Item>
          );
        })}
      </NavigationMenu.List>
    </NavigationMenu.Root>
  );
}

type SideNavigationState = 'open' | 'closed';
const storageKey = 'sideNavigationState';
export function getSideNavigationState(): SideNavigationState {
  return localStorage.getItem(storageKey)?.length
    ? (localStorage.getItem(storageKey) as SideNavigationState)
    : 'open';
}
export function setSideNavigationState(state: SideNavigationState) {
  localStorage.setItem(storageKey, state);
}
