import * as NavigationMenu from '@radix-ui/react-navigation-menu';
import { forwardRef, ReactNode, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from 'tailwind-preset';
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
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
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
      <Tooltip placement="right" content={title} triggerAsChild delayDuration={500}>
        <div tabIndex={-1}>{children}</div>
      </Tooltip>
    );
  },
);

export function SideNavigation({ expanded, onExpandedChange }: SideNavigationRootProps) {
  useEffect(() => {
    setSideNavigationState(expanded ? 'open' : 'closed');
  }, [expanded]);
  return (
    <NavigationMenu.Root
      orientation="vertical"
      className={cn(
        'overflow-x-hidden overflow-y-auto shrink-0',
        'bg-white dark:bg-bg-left-nav',
        'transition-[width]',
        'fixed left-0 top-0 z-10 scrolling-touch',
      )}
      style={{
        marginTop: '56px',
        width: expanded ? '240px' : '60px',
        height: 'calc(100vh - 56px)',
      }}
    >
      <NavigationMenu.List className={cn('flex flex-col')}>
        <NavigationMenu.Item>
          <NavigationMenu.Link asChild>
            <button
              className="h-12 w-full mb-2 flex pl-5 items-center border dark:border-bg-top-header"
              onClick={(e) => {
                e.preventDefault();
                onExpandedChange(!expanded);
              }}
            >
              <div className="h-5 w-5 dark:text-text-text-and-icon">
                <HamburgerIcon />
              </div>
            </button>
          </NavigationMenu.Link>
        </NavigationMenu.Item>
        {MenuItems.map((menuItem) => {
          const linkClass = cn(
            'text-h4 dark:text-text-text-and-icon py-3 px-5',
            'dark:hover:bg-bg-breadcrumb-bar',
            'flex items-center gap-5 whitespace-nowrap relative',
            'h-12',
          );

          return (
            <NavigationMenu.Item key={menuItem.title}>
              <NavigationMenu.Link asChild>
                <ItemWrapper expanded={expanded} title={menuItem.title}>
                  <NavLink
                    to={menuItem.to}
                    className={({ isActive }) =>
                      isActive
                        ? cn(
                            linkClass,
                            'dark:bg-bg-active-selection dark:text-text-input-value',
                          )
                        : linkClass
                    }
                  >
                    {({ isActive }) => {
                      return (
                        <>
                          {isActive && (
                            <div className="absolute w-1 left-0 top-0 bottom-0 dark:bg-brand-dark-blue" />
                          )}
                          <div
                            className={cn(
                              'w-5 h-5 dark:text-text-text-and-icon shrink-0',
                              {
                                'dark:text-text-input-value': isActive,
                              },
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

const HamburgerIcon = () => {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M2.5 15H15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2.5 10H12.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2.5 5H15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
