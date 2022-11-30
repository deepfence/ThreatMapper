import { Avatar, Dropdown, DropdownItem, DropdownSeparator } from 'ui-components';

type AuthLayoutProps = {
  children: React.ReactNode;
};
export const AuthLayout = ({ children }: AuthLayoutProps) => {
  return (
    <div>
      <div className="w-full bg-white darK:bg-gray-800 fixed h-[48px] flex items-center">
        <div className="ml-auto">
          <Dropdown
            triggerAsChild
            content={
              <>
                <DropdownItem>First Action</DropdownItem>
                <DropdownItem>Second Action</DropdownItem>
                <DropdownItem>Third Action</DropdownItem>
                <DropdownItem>Fourth Action</DropdownItem>
                <DropdownSeparator />
                <DropdownItem className="text-red-500 dark:text-red-500">
                  Sign Out
                </DropdownItem>
              </>
            }
          >
            <Avatar asChild>M</Avatar>
          </Dropdown>
        </div>
      </div>
      {/* <div className="w-[200px] h-screen bg-gray-500 fixed mt-[48px]">Sidebar</div> */}
      <div className="ml-[200px] pt-[48px] relative">{children}</div>
    </div>
  );
};
