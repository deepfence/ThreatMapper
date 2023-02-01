import cx from 'classnames';
import { IconContext } from 'react-icons';
import { HiLogout, HiMoon, HiOutlineBell } from 'react-icons/hi';
import { Avatar, Dropdown, DropdownItem, DropdownSeparator } from 'ui-components';

import NavIconDark from '@/assets/icon-nav-dark.svg';
import NavIconLight from '@/assets/icon-nav-light.svg';
import LogoDeepfenceDarkBlue from '@/assets/logo-deepfence-dark-blue.svg';
import { useTheme } from '@/theme/ThemeContext';

export interface DashboardHeaderProps {
  sideNavExpanded: boolean;
  onSideNavExpandedChange: (expanded: boolean) => void;
}

export function AppHeader({
  sideNavExpanded,
  onSideNavExpandedChange,
}: DashboardHeaderProps) {
  const { toggleMode, mode } = useTheme();

  return (
    <div className="bg-white dark:bg-gray-800 h-[64px] sticky top-0 w-full border-b border-gray-200 dark:border-gray-700">
      <div className="h-full flex items-center mx-2">
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
          <img
            src={LogoDeepfenceDarkBlue}
            alt="Deefence Logo"
            width="40"
            height="40"
            className="m-auto mr-6"
          />
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
                <DropdownItem onClick={toggleMode}>
                  <HiMoon />
                  Toggle Theme
                </DropdownItem>

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
    </div>
  );
}
