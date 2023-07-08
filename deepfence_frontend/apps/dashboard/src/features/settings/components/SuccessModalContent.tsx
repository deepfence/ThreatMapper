import { CheckCircleLineIcon } from '@/components/icons/common/CheckCircleLine';

export const SuccessModalContent = ({
  text,
  children,
}: {
  text?: string;
  children?: React.ReactNode;
}) => {
  return (
    <div className="grid place-items-center p-6">
      <span className="mb-3 dark:text-status-success text-green-400 w-[70px] h-[70px]">
        <CheckCircleLineIcon />
      </span>
      {text && <h3 className="mb-4 font-normal text-center text-sm">{text}</h3>}
      {children}
    </div>
  );
};
