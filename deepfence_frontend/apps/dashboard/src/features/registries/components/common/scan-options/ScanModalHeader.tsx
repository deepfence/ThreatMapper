import { ReactNode } from 'react';
import { IconContext } from 'react-icons';
import { ModalHeader } from 'ui-components';
export const ScanModalHeader = ({
  Icon,
  header,
}: {
  Icon: ReactNode;
  header: string;
}) => {
  return (
    <ModalHeader>
      <div className="flex flex-row border-b-0 mt-2 mb-2">
        <IconContext.Provider
          value={{
            className: 'ml-2 w-5 h-5 text-blue-600 dark:text-blue-500',
          }}
        >
          {Icon}
        </IconContext.Provider>
        <div className="ml-2 text-base font-medium">{header}</div>
      </div>
    </ModalHeader>
  );
};
