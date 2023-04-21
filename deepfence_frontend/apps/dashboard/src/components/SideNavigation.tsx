import * as NavigationMenu from '@radix-ui/react-navigation-menu';
import classNames from 'classnames';
import { forwardRef, ReactNode, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { twMerge } from 'tailwind-merge';
import { Tooltip } from 'ui-components';

import DeepfenceBackground from '@/assets/df-background.jpg';
import LogoDeepfenceWhite from '@/assets/logo-deepfence-white.svg';
import { DFLink } from '@/components/DFLink';
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
    to: '/settings/user-management',
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
      <Tooltip placement="right" content={title} triggerAsChild delayDuration={100}>
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
      className={twMerge(
        classNames(
          'overflow-x-hidden overflow-y-auto shrink-0',
          'bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700',
          'transition-[width]',
          'fixed left-0 top-0 py-3 px-3 z-10 scrolling-touch',
          {
            ['px-2.5']: !expanded,
          },
        ),
      )}
      style={{
        width: expanded ? '240px' : '60px',
        height: '100vh',
        background: `url(${DeepfenceBackground})`,
      }}
    >
      <NavigationMenu.List className={classNames('flex flex-col gap-1.5')}>
        <NavigationMenu.Item>
          <NavigationMenu.Link asChild>
            <DFLink to="/" className="flex">
              <img
                src={LogoDeepfenceWhite}
                alt="Deefence Logo"
                width="40"
                height="40"
                className="m-auto pt-2 pb-6"
              />
            </DFLink>
          </NavigationMenu.Link>
        </NavigationMenu.Item>
        {MenuItems.map((menuItem) => {
          const linkClass = classNames(
            'text-base font-medium text-gray-100 rounded-xl p-2 block',
            'hover:bg-gray-100/25',
            'flex gap-3 whitespace-nowrap',
            'group',
            'animate-colors',
            'focus:outline-none focus:ring-1 focus:ring-gray-400',
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
                      isActive ? twMerge(linkClass, 'bg-gray-100/25') : linkClass
                    }
                  >
                    <div
                      className={twMerge(
                        classNames('w-6 h-6 text-gray-100 shrink-0', {}),
                      )}
                    >
                      <menuItem.Icon />
                    </div>
                    {expanded && (
                      <div className="overflow-hidden flex-1">{menuItem.title}</div>
                    )}
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
