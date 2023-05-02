import { IconContext } from 'react-icons';
import { HiOutlineCheckCircle } from 'react-icons/hi';

export const SuccessModalContent = ({
  text,
  children,
}: {
  text?: string;
  children?: React.ReactNode;
}) => {
  return (
    <div className="grid place-items-center p-6">
      <IconContext.Provider
        value={{
          className: 'mb-3 dark:text-green-600 text-green-400 w-[70px] h-[70px]',
        }}
      >
        <HiOutlineCheckCircle />
      </IconContext.Provider>
      {text && <h3 className="mb-4 font-normal text-center text-sm">{text}</h3>}
      {children}
    </div>
  );
};
