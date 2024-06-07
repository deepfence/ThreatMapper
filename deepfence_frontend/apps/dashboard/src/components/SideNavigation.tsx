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

interface MenuSubItem {
  title: string;
  to: string;
}

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
    title: 'Inventory',
    Icon: TopologyIcon,
    to: '/inventory',
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
        'overflow-y-auto overflow-x-hidden',
        'dark:bg-bg-left-nav bg-white',
        'transition-[width]',
        'fixed left-0 z-10 scrolling-touch',
        'dark:border-r dark:border-bg-top-header',
        'dark:shadow-none shadow-md',
      )}
      style={{
        top: '56px',
        width: expanded ? '240px' : '61px',
        height: 'calc(100vh - 56px)',
      }}
    >
      <ul className={cn('flex flex-col h-full')}>
        <li>
          <button
            className="h-12 w-full mb-2 flex pl-5 items-center dark:border dark:border-bg-top-header"
            onClick={(e) => {
              e.preventDefault();
              onExpandedChange(!expanded);
            }}
          >
            <div className="h-5 w-5 text-text-text-and-icon">
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
    'text-h4 text-text-text-and-icon py-3 pl-5 pr-3',
    'hover:bg-bg-breadcrumb-bar',
    'flex items-center whitespace-nowrap',
    'h-12 w-full text-left relative',
    {
      'bg-bg-breadcrumb-bar': hasActiveChildren,
    },
  );

  useEffect(() => {
    if (expanded && hasActiveChildren) {
      setShowSubmenu(true);
    }
  }, [expanded, hasActiveChildren]);

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
          {hasActiveChildren && !expanded && (
            <div className="absolute w-1 left-0 top-0 bottom-0 bg-brand-dark-blue" />
          )}
          <div className={cn('w-5 h-5 text-text-text-and-icon shrink-0')}>
            {Icon ? <Icon /> : null}
          </div>
          {expanded && <div className="overflow-hidden flex-1 ml-5">{title}</div>}
          {expanded && (
            <div
              className={cn(
                'h-4 w-4 text-text-text-and-icon shrink-0 transition-all transform -rotate-90 ml-auto',
                {
                  'rotate-0': showSubMenu,
                },
              )}
            >
              <CaretDown />
            </div>
          )}
        </button>
        {!expanded && showFlyout ? (
          <div
            className="fixed"
            style={{
              left: liRef.current?.getBoundingClientRect().width,
              top: liRef.current?.getBoundingClientRect().y,
            }}
          >
            <ul
              className="min-w-[200px] bg-bg-card border-y border-r border-bg-left-nav rounded-[5px] py-2 ml-1"
              style={{
                boxShadow: '0px 1px 3px 0px rgba(0, 0, 0, 0.25)',
              }}
            >
              <li className="px-4 py-1.5 text-h4 text-df-gray-500">{title}</li>
              {subItems.map((subItem) => {
                return (
                  <MenuSubItemLink
                    key={subItem.to}
                    title={subItem.title}
                    link={subItem.to}
                    onLinkClick={() => {
                      setShowFlyout(false);
                    }}
                    flyout
                  />
                );
              })}
            </ul>
          </div>
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
    'text-h4 text-text-text-and-icon py-3 px-5',
    'hover:bg-bg-breadcrumb-bar',
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
              ? cn(
                  linkClass,
                  'dark:bg-bg-active-selection bg-bg-breadcrumb-bar text-text-input-value shadow-[0px_0px_1px_0px_rgba(0,0,0,0.25)_inset]',
                )
              : linkClass
          }
        >
          {({ isActive }) => {
            return (
              <>
                {isActive && (
                  <div className="absolute w-1 left-0 top-0 bottom-0 bg-brand-dark-blue rounded-br rounded-tr" />
                )}
                <div
                  className={cn('w-5 h-5 text-text-text-and-icon shrink-0', {
                    'text-text-input-value': isActive,
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
  flyout,
}: {
  title: string;
  link: string;
  onLinkClick?: MouseEventHandler<HTMLAnchorElement>;
  flyout?: boolean;
}) => {
  const linkClass = cn(
    'text-h4 text-text-text-and-icon py-3 px-5',
    'hover:bg-bg-breadcrumb-bar',
    'flex items-center gap-5 whitespace-nowrap relative',
    'h-12 w-full',
  );

  return (
    <li key={title}>
      <NavLink
        to={link}
        className={({ isActive }) =>
          isActive
            ? cn(
                linkClass,
                'dark:bg-bg-active-selection bg-bg-breadcrumb-bar text-text-input-value',
              )
            : linkClass
        }
        onClick={onLinkClick}
      >
        {({ isActive }) => {
          return (
            <>
              {isActive && (
                <div className="absolute w-1 left-0 top-0 bottom-0 bg-brand-dark-blue" />
              )}
              <div
                className={cn('overflow-hidden flex-1 pl-10', {
                  'pl-3': flyout,
                })}
              >
                {title}
              </div>
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
