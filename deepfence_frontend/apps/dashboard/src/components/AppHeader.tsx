import cx from 'classnames';
import { IconContext } from 'react-icons';
import {
  HiChevronLeft,
  HiLogout,
  HiOutlineBell,
  HiOutlineDesktopComputer,
  HiOutlineMoon,
  HiOutlineSun,
} from 'react-icons/hi';
import {
  Avatar,
  Dropdown,
  DropdownItem,
  DropdownSeparator,
  DropdownSubMenu,
} from 'ui-components';

import NavIconDark from '@/assets/icon-nav-dark.svg';
import NavIconLight from '@/assets/icon-nav-light.svg';
import LogoDeepfenceDarkBlue from '@/assets/logo-deepfence-dark-blue.svg';
import { DFLink } from '@/components/DFLink';
import { useTheme } from '@/theme/ThemeContext';

export interface DashboardHeaderProps {
  sideNavExpanded: boolean;
  onSideNavExpandedChange: (expanded: boolean) => void;
}

const themeSelectedDropdownClassname = 'text-blue-500 dark:text-blue-300';
const themeDropdownClassname = 'text-gray-700 dark:text-gray-400';

export function AppHeader({
  sideNavExpanded,
  onSideNavExpandedChange,
}: DashboardHeaderProps) {
  const { setMode, userSelectedMode, mode } = useTheme();

  return (
    <header className="fixed top-0 px-2 bg-white dark:bg-gray-800 h-[64px] w-full border-b border-gray-200 dark:border-gray-700">
      <div className="h-full flex items-center">
        <div className="mr-auto flex gap-4">
          <button
            onClick={() => {
              onSideNavExpandedChange(!sideNavExpanded);
            }}
            className={cx(
              'outline-none focus:ring-0 focus-visible:ring-2 dark:focus-visible:ring-blue-700',
              'p-2 rounded-md',
            )}
          >
            <img
              src={mode === 'dark' ? NavIconDark : NavIconLight}
              alt="Nav Icon"
              width="24"
              height="24"
            />
          </button>
          <DFLink to="/" className="flex items-center">
            <img
              src={LogoDeepfenceDarkBlue}
              alt="Deefence Logo"
              width="40"
              height="40"
              className="m-auto mr-6"
            />
          </DFLink>
        </div>
        <div className="flex items-center gap-4">
          <IconContext.Provider
            value={{
              className: 'w-6 h-6 p-1 text-blue-600 dark:text-white',
            }}
          >
            <HiOutlineBell />
          </IconContext.Provider>
          <Dropdown
            triggerAsChild
            align="end"
            content={
              <>
                <DropdownSubMenu
                  triggerAsChild
                  content={
                    <>
                      <DropdownItem
                        onClick={() => {
                          setMode('light');
                        }}
                        className={
                          userSelectedMode === 'light'
                            ? themeSelectedDropdownClassname
                            : themeDropdownClassname
                        }
                      >
                        <HiOutlineSun />
                        Light
                      </DropdownItem>
                      <DropdownItem
                        onClick={() => {
                          setMode('dark');
                        }}
                        className={
                          userSelectedMode === 'dark'
                            ? themeSelectedDropdownClassname
                            : themeDropdownClassname
                        }
                      >
                        <HiOutlineMoon />
                        Dark
                      </DropdownItem>
                      <DropdownItem
                        onClick={() => {
                          setMode(undefined);
                        }}
                        className={
                          !userSelectedMode
                            ? themeSelectedDropdownClassname
                            : themeDropdownClassname
                        }
                      >
                        <HiOutlineDesktopComputer />
                        Device Theme
                      </DropdownItem>
                    </>
                  }
                >
                  <DropdownItem onClick={(e) => e.preventDefault()}>
                    <IconContext.Provider
                      value={{
                        className: 'w-4 h-4',
                      }}
                    >
                      <HiChevronLeft />
                    </IconContext.Provider>
                    <span className="text-gray-700 dark:text-gray-400">Theme</span>
                  </DropdownItem>
                </DropdownSubMenu>

                <DropdownSeparator />
                <DropdownItem
                  onClick={() => {
                    /**TODO */
                  }}
                  className="text-red-700 dark:text-red-500"
                >
                  <HiLogout />
                  Logout
                </DropdownItem>
              </>
            }
          >
            <div>
              <Avatar />
            </div>
          </Dropdown>
        </div>
      </div>
    </header>
  );
}
