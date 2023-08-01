import { MouseEventHandler, ReactNode, useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from 'tailwind-preset';
import { Tooltip } from 'ui-components';

import { CaretDown } from '@/components/icons/common/CaretDown';
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

type MenuSubItem = {
  title: string;
  to: string;
};

type MenuItem =
  | {
      title: string;
      Icon: () => JSX.Element;
      to: string;
    }
  | {
      title: string;
      Icon: () => JSX.Element;
      subItems: Array<MenuSubItem>;
    };

const DefaultMenuItems: Array<MenuItem> = [
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

const ItemWrapper = ({
  expanded,
  title,
  children,
}: {
  expanded?: boolean;
  title: string;
  children: ReactNode;
}) => {
  if (expanded) return <div>{children}</div>;
  return (
    <Tooltip placement="right" content={title} triggerAsChild delayDuration={500}>
      <button tabIndex={-1}>{children}</button>
    </Tooltip>
  );
};

export function SideNavigation({ expanded, onExpandedChange }: SideNavigationRootProps) {
  useEffect(() => {
    setSideNavigationState(expanded ? 'open' : 'closed');
  }, [expanded]);
  return (
    <nav
      className={cn(
        'overflow-y-auto',
        'bg-white dark:bg-bg-left-nav',
        'transition-[width]',
        'fixed left-0 top-0 z-10 scrolling-touch',
        'border-r dark:border-bg-top-header',
      )}
      style={{
        marginTop: '56px',
        width: expanded ? '240px' : '61px',
        height: '100%',
      }}
    >
      <ul className={cn('flex flex-col')}>
        <li>
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
        </li>
        {DefaultMenuItems.map((menuItem) => {
          if ('subItems' in menuItem && menuItem.subItems?.length) {
            return (
              <MenuItemButton
                title={menuItem.title}
                Icon={menuItem.Icon}
                expanded={expanded}
                key={menuItem.title}
                subItems={menuItem.subItems}
              />
            );
          } else if ('to' in menuItem) {
            return (
              <MenuItemLink
                title={menuItem.title}
                Icon={menuItem.Icon}
                expanded={expanded}
                key={menuItem.title}
                link={menuItem.to}
              />
            );
          }
        })}
      </ul>
    </nav>
  );
}

const MenuItemButton = ({
  title,
  expanded,
  Icon,
  subItems,
}: {
  title: string;
  expanded: boolean;
  Icon?: () => JSX.Element;
  subItems: MenuSubItem[];
}) => {
  const [showFlyout, setShowFlyout] = useState(false);
  const [showSubMenu, setShowSubmenu] = useState(false);
  const liRef = useRef<HTMLLIElement>(null);
  const [hasActiveChildren, setHasActiveChildren] = useState(false);

  const location = useLocation();

  useEffect(() => {
    setHasActiveChildren(() => {
      return subItems.some((subItem) => {
        return location.pathname.toLowerCase().startsWith(subItem.to.toLowerCase());
      });
    });
  }, [location]);

  const btnClass = cn(
    'text-h4 dark:text-text-text-and-icon py-3 px-5',
    'dark:hover:bg-bg-breadcrumb-bar',
    'flex items-center gap-5 whitespace-nowrap',
    'h-12 w-full text-left',
    {
      'dark:bg-bg-breadcrumb-bar': hasActiveChildren,
    },
  );

  return (
    <>
      <li
        key={title}
        ref={liRef}
        className="relative"
        onMouseEnter={() => setShowFlyout(true)}
        onMouseLeave={() => setShowFlyout(false)}
      >
        <button
          className={cn(btnClass, '')}
          onClick={() => {
            if (expanded) setShowSubmenu((prev) => !prev);
          }}
        >
          <div className={cn('w-5 h-5 dark:text-text-text-and-icon shrink-0')}>
            {Icon ? <Icon /> : null}
          </div>
          {expanded && <div className="overflow-hidden flex-1">{title}</div>}
          {expanded && (
            <div
              className={cn(
                'h-4 w-4 dark:text-text-text-and-icon shrink-0 transition-all transform',
                {
                  '-rotate-180': showSubMenu,
                },
              )}
            >
              <CaretDown />
            </div>
          )}
        </button>
        {!expanded && showFlyout ? (
          <ul
            className="fixed min-w-[200px] dark:bg-bg-left-nav border-y-2 border-r-2 dark:border-bg-top-header"
            style={{
              left: liRef.current?.getBoundingClientRect().width,
              top: liRef.current?.getBoundingClientRect().y,
            }}
          >
            {subItems.map((subItem) => {
              return (
                <MenuSubItemLink
                  key={subItem.to}
                  title={subItem.title}
                  link={subItem.to}
                  onLinkClick={() => {
                    setShowFlyout(false);
                  }}
                />
              );
            })}
          </ul>
        ) : null}
      </li>
      {expanded && showSubMenu ? (
        <>
          {subItems.map((subItem) => {
            return (
              <MenuSubItemLink key={subItem.to} title={subItem.title} link={subItem.to} />
            );
          })}
        </>
      ) : null}
    </>
  );
};

const MenuItemLink = ({
  title,
  expanded,
  link,
  Icon,
}: {
  title: string;
  expanded: boolean;
  link: string;
  Icon?: () => JSX.Element;
}) => {
  const linkClass = cn(
    'text-h4 dark:text-text-text-and-icon py-3 px-5',
    'dark:hover:bg-bg-breadcrumb-bar',
    'flex items-center gap-5 whitespace-nowrap relative',
    'h-12 w-full',
  );

  return (
    <li key={title}>
      <ItemWrapper expanded={expanded} title={title}>
        <NavLink
          to={link}
          className={({ isActive }) =>
            isActive
              ? cn(linkClass, 'dark:bg-bg-active-selection dark:text-text-input-value')
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
                  className={cn('w-5 h-5 dark:text-text-text-and-icon shrink-0', {
                    'dark:text-text-input-value': isActive,
                  })}
                >
                  {Icon ? <Icon /> : null}
                </div>
                {expanded && <div className="overflow-hidden flex-1">{title}</div>}
              </>
            );
          }}
        </NavLink>
      </ItemWrapper>
    </li>
  );
};

const MenuSubItemLink = ({
  title,
  link,
  onLinkClick,
}: {
  title: string;
  link: string;
  onLinkClick?: MouseEventHandler<HTMLAnchorElement>;
}) => {
  const linkClass = cn(
    'text-h4 dark:text-text-text-and-icon py-3 px-5',
    'dark:hover:bg-bg-breadcrumb-bar',
    'flex items-center gap-5 whitespace-nowrap relative',
    'h-12 w-full',
  );

  return (
    <li key={title}>
      <NavLink
        to={link}
        className={({ isActive }) =>
          isActive
            ? cn(linkClass, 'dark:bg-bg-active-selection dark:text-text-input-value')
            : linkClass
        }
        onClick={onLinkClick}
      >
        {({ isActive }) => {
          return (
            <>
              {isActive && (
                <div className="absolute w-1 left-0 top-0 bottom-0 dark:bg-brand-dark-blue" />
              )}
              <div className="overflow-hidden flex-1 pl-10">{title}</div>
            </>
          );
        }}
      </NavLink>
    </li>
  );
};

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
