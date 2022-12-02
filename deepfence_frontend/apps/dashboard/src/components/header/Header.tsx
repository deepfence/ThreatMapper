import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Button, Dropdown, DropdownItem, DropdownSeparator } from 'ui-components';

import deepfenceLogo from '../../assets/deepfence-logo.png';
import { useTheme } from '../../theme/ThemeContext';
import storage from '../../utils/storage';
import { SideNav } from '../nav';

export const Header = () => {
  const navigate = useNavigate();
  const navIconRef = useRef(null);
  const [shouldOpenSideNav, setShouldOpenSideNav] = useState(false);
  const { toggleMode } = useTheme();

  const handleSideNavToggle = () => {
    setShouldOpenSideNav(!shouldOpenSideNav);
  };

  const signOut = () => {
    storage.setAuth({ isLogin: false });
    navigate('/login', {
      replace: true,
    });
  };

  const onDeepfeceLogClick = () => {
    // navigate('/home', {
    //   replace: true,
    // });
    setShouldOpenSideNav(true);
  };

  const switchTheme = () => toggleMode?.();

  return (
    <>
      <SideNav
        isToggleOn={shouldOpenSideNav}
        elementToFocusOnCloseRef={navIconRef}
        handleToggle={handleSideNavToggle}
      />
      <div className="w-full bg-white darK:bg-gray-800 h-[48px] fixed flex items-center">
        <Button
          onClick={onDeepfeceLogClick}
          className="max-w-[150px] pl-2 bg-transparent border-0 hover:bg-transparent"
          ref={navIconRef}
        >
          <img src={deepfenceLogo} alt="Deepfence Logo" />
        </Button>
        <Dropdown
          triggerAsChild
          content={
            <>
              <DropdownItem>User Profile</DropdownItem>
              <DropdownItem onClick={switchTheme}>Switch App Theme</DropdownItem>
              <DropdownSeparator />
              <DropdownItem className="text-red-500 dark:text-red-500" onClick={signOut}>
                Sign Out
              </DropdownItem>
            </>
          }
        >
          {/* div wrapper to skip warning button cannot have button as descendantes */}
          <div className="ml-auto pr-2">
            <Avatar asChild></Avatar>
          </div>
        </Dropdown>
      </div>
    </>
  );
};
