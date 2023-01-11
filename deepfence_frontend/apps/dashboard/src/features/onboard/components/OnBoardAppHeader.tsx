import { IconContext } from 'react-icons';
import { HiLogout, HiMoon, HiOutlineBell } from 'react-icons/hi';
import {
  Avatar,
  Button,
  Dropdown,
  DropdownItem,
  DropdownSeparator,
  Separator,
} from 'ui-components';

import LogoDeepfenceDarkBlue from '../../../assets/logo-deepfence-dark-blue.svg';
import { useTheme } from '../../../theme/ThemeContext';
import storage from '../../../utils/storage';
import { usePageNavigation } from '../../../utils/usePageNavigation';

export const OnboardAppHeader = () => {
  const { navigate } = usePageNavigation();
  const { toggleMode } = useTheme();

  const logout = () => {
    storage.clearAuth();
    navigate('/auth/login');
  };

  return (
    <div className="bg-white dark:bg-gray-800 h-[64px] fixed top-0 w-full">
      <div className="h-full flex items-center mx-16">
        <div className="mr-auto flex">
          <img
            src={LogoDeepfenceDarkBlue}
            alt="Deefence Logo"
            width="46.95"
            height="29"
            className="m-auto"
          />
          <Button color="primary" outline size="xs" className="ml-5 rounded-[22px]">
            Go to Dashboard
          </Button>
        </div>
        <div className="flex items-center gap-4">
          <IconContext.Provider
            value={{
              className: 'w-6 h-6 p-1 text-gray-600 dark:text-white cursor-pointer',
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
    </div>
  );
};
