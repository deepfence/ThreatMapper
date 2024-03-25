import { useFetcher, useRouteLoaderData } from 'react-router-dom';
import { Dropdown, DropdownItem, DropdownSubMenu, Separator } from 'ui-components';

import { DFLink } from '@/components/DFLink';
import { CaretDown } from '@/components/icons/common/CaretDown';
import { UserLine } from '@/components/icons/common/UserLine';
import { Mode, useTheme } from '@/theme/ThemeContext';

const DeepfenceLogo = ({ mode }: { mode: Mode }) => {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M21.1188 23.2243L16.099 17.2116L13.9307 14.59L12.9505 13.4216L10.7822 10.8H6.23763H4.54456H0L3 14.59H7.54456H9.23763L10.2178 15.7298L11.5842 17.2116L18.8614 25.9314L18 26.9572L9.86139 17.2116L8.49505 15.7298H3.9802L5.34654 17.2116L15.7426 29.6929L18 32.4L20.2574 29.6929L21.1188 28.667L23.3762 25.9314L21.1188 23.2243Z"
        fill={mode === 'light' ? '#006FE6' : '#2742e7'}
      />
      <path
        d="M27.297 21.2581L30.6535 17.2117L31.8416 15.7869H22.6931L27.297 21.2581Z"
        fill={mode === 'light' ? '#006FE6' : '#2742e7'}
      />
      <path
        d="M20.1683 14.6185H21.7129H32.8218L32.8515 14.59L33.802 13.4216L36 10.8H31.4554H16.9901H12.4752L14.6733 13.4216L15.6237 14.59L17.8218 17.2116L21.9802 22.1984L24.2376 24.9055L26.495 22.1984L26.5247 22.1699L21.1485 15.7868L20.1683 14.6185Z"
        fill={mode === 'light' ? '#006FE6' : '#2742e7'}
      />
    </svg>
  );
};

export const OnboardAppHeader = () => {
  const fetcher = useFetcher();
  const { setMode, userSelectedMode, mode } = useTheme();
  const { email } = (useRouteLoaderData('onboard') as { email: string }) ?? {
    email: '',
  };
  const logout = () => {
    fetcher.submit(null, {
      method: 'post',
      action: '/data-component/auth/logout',
    });
  };

  return (
    <div className="bg-bg-left-nav border-b border-bg-top-header shadow-[0px_0px_2px_-2px_rgba(0,0,0,0.05),0px_2px_2px_-1px_rgba(0,0,0,0.10)] isolate h-[54px] fixed top-0 w-full">
      <div className="h-full flex items-center mx-16">
        <div className="mr-auto flex items-center">
          <span className="h-9 w-9 mr-3">
            <DeepfenceLogo mode={mode} />
          </span>
          <span className="dark:text-text-text-and-icon text-text-text-inverse text-[18px] leading-9">
            deepfence
          </span>
          <DFLink
            unstyled
            className="ml-8 text-[#489cff] hover:underline text-p3"
            to="/dashboard"
          >
            Go to main dashboard
          </DFLink>
        </div>
        <div className="flex items-center gap-4">
          <Dropdown
            triggerAsChild
            align="end"
            loop
            content={
              <>
                <DropdownSubMenu
                  triggerAsChild
                  content={
                    <>
                      <DropdownItem
                        selected={!userSelectedMode}
                        onSelect={() => {
                          setMode(undefined);
                        }}
                      >
                        System
                      </DropdownItem>
                      <DropdownItem
                        selected={userSelectedMode === 'light'}
                        onSelect={() => {
                          setMode('light');
                        }}
                      >
                        Light
                      </DropdownItem>
                      <DropdownItem
                        selected={userSelectedMode === 'dark'}
                        onSelect={() => {
                          setMode('dark');
                        }}
                      >
                        Dark
                      </DropdownItem>
                    </>
                  }
                >
                  Theme
                </DropdownSubMenu>
                <DropdownItem onClick={logout}>Logout</DropdownItem>
              </>
            }
          >
            <button
              className="dark:text-text-text-and-icon text-bg-grid-border flex gap-[6px] items-center text-p1a"
              data-testid="buttonLoginUserDropdownId"
            >
              <div className="h-[18px] w-[18px]">
                <UserLine />
              </div>
              <div>{email}</div>
              <div className="h-3 w-3">
                <CaretDown />
              </div>
            </button>
          </Dropdown>
        </div>
      </div>
      <Separator />
    </div>
  );
};
