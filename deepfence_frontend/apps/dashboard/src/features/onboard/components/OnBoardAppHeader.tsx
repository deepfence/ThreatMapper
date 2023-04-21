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
import { Link, useFetcher } from 'react-router-dom';
import {
  Avatar,
  Dropdown,
  DropdownItem,
  DropdownSeparator,
  DropdownSubMenu,
  Separator,
  Typography,
} from 'ui-components';

import LogoDeepfenceDarkBlue from '@/assets/logo-deepfence-dark-blue.svg';
import { useTheme } from '@/theme/ThemeContext';

const themeSelectedDropdownClassname = 'text-blue-500 dark:text-blue-300';
const themeDropdownClassname = 'text-gray-700 dark:text-gray-400';

export const OnboardAppHeader = ({
  showGotoDashboard,
}: {
  showGotoDashboard: boolean;
}) => {
  const { setMode, userSelectedMode } = useTheme();
  const fetcher = useFetcher();

  const logout = () => {
    fetcher.submit(null, {
      method: 'post',
      action: '/data-component/auth/logout',
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 h-[64px] fixed top-0 w-full">
      <div className="h-full flex items-center mx-16">
        <div className="mr-auto flex items-center">
          <img
            src={LogoDeepfenceDarkBlue}
            alt="Deefence Logo"
            width="46.95"
            height="29"
            className="m-auto"
          />
          {showGotoDashboard ? (
            <Link
              to="/dashboard"
              className={cx(
                `${Typography.size.sm} `,
                'underline underline-offset-2 ml-6 bg-transparent text-blue-600 dark:text-blue-500',
              )}
            >
              Go To Dashboard
            </Link>
          ) : null}
        </div>
        <div className="flex items-center gap-4">
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
                <DropdownItem onClick={logout} className="text-red-700 dark:text-red-500">
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
      <Separator />
    </div>
  );
};
