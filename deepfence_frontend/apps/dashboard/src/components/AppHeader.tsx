import cx from 'classnames';
import { useCallback, useRef, useState } from 'react';
import { IconContext } from 'react-icons';
import {
  HiAcademicCap,
  HiAdjustments,
  HiCake,
  HiHome,
  HiLogout,
  HiMap,
  HiMoon,
  HiOutlineBell,
  HiPaperAirplane,
} from 'react-icons/hi';
import { useLocation } from 'react-use';
import {
  Avatar,
  Dropdown,
  DropdownItem,
  DropdownSeparator,
  IconButton,
  Separator,
  SlidingModal,
} from 'ui-components';

import NavIconDark from '@/assets/icon-nav-dark.svg';
import NavIconLight from '@/assets/icon-nav-light.svg';
import LogoDeepfenceDarkBlue from '@/assets/logo-deepfence-dark-blue.svg';
import { useTheme } from '@/theme/ThemeContext';
import storage from '@/utils/storage';

interface FocusableElement {
  focus(options?: FocusOptions): void;
}

const NavSidebar = ({
  elementToFocusOnCloseRef,
  shouldNavOpen,
  setShouldOpenNav,
}: {
  elementToFocusOnCloseRef: React.RefObject<FocusableElement>;
  shouldNavOpen: boolean;
  setShouldOpenNav: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const { pathname = '' } = useLocation();

  return (
    <SlidingModal
      open={shouldNavOpen}
      direction="left"
      width="w-[240px]"
      onOpenChange={() => {
        setShouldOpenNav(false);
      }}
      elementToFocusOnCloseRef={elementToFocusOnCloseRef}
    >
      <div className="pt-10">
        <ul className="space-y-3 cursor-pointer text-sm">
          <li
            className={cx(
              'flex items-center gap-x-3 py-1',
              'hover:text-blue-600 dark:hover:text-blue-500',
              'rounded',
              'hover:bg-[linear-gradient(270deg,_#EBF5FF_-0.07%,_#FFFFFF_100%)]',
              'dark:hover:bg-[linear-gradient(270deg,_#1c2431_-0.07%,_#111928_100%)]',
              {
                'text-blue-600 dark:text-blue-500': pathname?.startsWith('/dashboard'),
                'bg-[linear-gradient(270deg,_#EBF5FF_-0.07%,_#FFFFFF_100%)]':
                  pathname?.startsWith('/dashboard'),
                'dark:bg-[linear-gradient(270deg,_#1c2431_-0.07%,_#111928_100%)]':
                  pathname?.startsWith('/dashboard'),
              },
            )}
          >
            <IconContext.Provider
              value={{
                className: cx('ml-3 text-gray-400', {
                  'text-blue-600 dark:text-blue-500': pathname?.startsWith('/dashboard'),
                }),
              }}
            >
              <HiHome />
            </IconContext.Provider>

            <span className={cx('tracking-wide')}>Dashboard</span>
          </li>
          <li
            className={cx(
              'flex items-center gap-x-3 py-1',
              'hover:text-blue-600 dark:hover:text-blue-500',
              'rounded',
              'hover:bg-[linear-gradient(270deg,_#EBF5FF_-0.07%,_#FFFFFF_100%)]',
              'dark:hover:bg-[linear-gradient(270deg,_#1c2431_-0.07%,_#111928_100%)]',
            )}
          >
            <IconContext.Provider
              value={{
                className: 'ml-3 text-gray-400',
              }}
            >
              <HiPaperAirplane />
            </IconContext.Provider>

            <span className={cx('tracking-wide')}>Vulnerability</span>
          </li>
          <li
            className={cx(
              'flex items-center gap-x-3 py-1',
              'hover:text-blue-600 dark:hover:text-blue-500',
              'rounded',
              'hover:bg-[linear-gradient(270deg,_#EBF5FF_-0.07%,_#FFFFFF_100%)]',
              'dark:hover:bg-[linear-gradient(270deg,_#1c2431_-0.07%,_#111928_100%)]',
            )}
          >
            <IconContext.Provider
              value={{
                className: 'ml-3 text-gray-400',
              }}
            >
              <HiMap />
            </IconContext.Provider>

            <span className={cx('tracking-wide')}>Secret</span>
          </li>
          <li
            className={cx(
              'flex items-center gap-x-3 py-1',
              'hover:text-blue-600 dark:hover:text-blue-500',
              'rounded',
              'hover:bg-[linear-gradient(270deg,_#EBF5FF_-0.07%,_#FFFFFF_100%)]',
              'dark:hover:bg-[linear-gradient(270deg,_#1c2431_-0.07%,_#111928_100%)]',
            )}
          >
            <IconContext.Provider
              value={{
                className: 'ml-3 text-gray-400',
              }}
            >
              <HiCake />
            </IconContext.Provider>

            <span className={cx('tracking-wide')}>Posture</span>
          </li>

          <li
            className={cx(
              'flex items-center gap-x-3 py-1',
              'hover:text-blue-600 dark:hover:text-blue-500',
              'rounded',
              'hover:bg-[linear-gradient(270deg,_#EBF5FF_-0.07%,_#FFFFFF_100%)]',
              'dark:hover:bg-[linear-gradient(270deg,_#1c2431_-0.07%,_#111928_100%)]',
            )}
          >
            <IconContext.Provider
              value={{
                className: 'ml-3 text-gray-400',
              }}
            >
              <HiAcademicCap />
            </IconContext.Provider>

            <span className={cx('tracking-wide')}>Malware</span>
          </li>
          <li
            className={cx(
              'flex items-center gap-x-3 py-1',
              'hover:text-blue-600 dark:hover:text-blue-500',
              'rounded',
              'hover:bg-[linear-gradient(270deg,_#EBF5FF_-0.07%,_#FFFFFF_100%)]',
              'dark:hover:bg-[linear-gradient(270deg,_#1c2431_-0.07%,_#111928_100%)]',
            )}
          >
            <IconContext.Provider
              value={{
                className: 'ml-3 text-gray-400',
              }}
            >
              <HiAdjustments />
            </IconContext.Provider>

            <span className={cx('tracking-wide')}>Registries</span>
          </li>
          <li
            className={cx(
              'flex items-center gap-x-3 py-1',
              'hover:text-blue-600 dark:hover:text-blue-500',
              'rounded',
              'hover:bg-[linear-gradient(270deg,_#EBF5FF_-0.07%,_#FFFFFF_100%)]',
              'dark:hover:bg-[linear-gradient(270deg,_#1c2431_-0.07%,_#111928_100%)]',
            )}
          >
            <IconContext.Provider
              value={{
                className: 'ml-3 text-gray-400',
              }}
            >
              <HiHome />
            </IconContext.Provider>

            <span className={cx('tracking-wide')}>Integrations</span>
          </li>
        </ul>
      </div>
    </SlidingModal>
  );
};

export const AppHeader = () => {
  const { toggleMode, mode } = useTheme();
  const [shouldOpeNnav, setShouldOpenNav] = useState(false);

  const navIconRef = useRef(null);

  const logout = () => {
    storage.clearAuth();
  };

  const onNavIconClick = useCallback(() => {
    setShouldOpenNav(!shouldOpeNnav);
  }, [shouldOpeNnav]);

  return (
    <div className="bg-white dark:bg-gray-800 h-[64px] fixed top-0 w-full">
      <div className="h-full flex items-center mx-2">
        <div className="mr-auto flex">
          <img
            src={LogoDeepfenceDarkBlue}
            alt="Deefence Logo"
            width="40"
            height="40"
            className="m-auto mr-6"
          />
          <IconButton
            icon={
              <img
                src={mode === 'dark' ? NavIconDark : NavIconLight}
                alt="Nav Icon"
                width="22"
                height="20"
              />
            }
            ref={navIconRef}
            onClick={onNavIconClick}
            color="normal"
            className={cx(
              'hover:bg-white dark:hover:bg-gray-800 hover:scale-105',
              'duration-100 ease-in-out',
              'outline-none focus:ring-0 focus-visible:ring-4 dark:focus-visible:ring-gray-700',
            )}
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
      <NavSidebar
        shouldNavOpen={shouldOpeNnav}
        elementToFocusOnCloseRef={navIconRef}
        setShouldOpenNav={setShouldOpenNav}
      />
    </div>
  );
};
