import { SVGProps } from 'react';

export const TableChevronDefault = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M5.49677 5.99997L8.01868 3.34106L10.5034 5.99997"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.49677 10L8.01868 12.6589L10.5034 10"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export const TableChevronUp = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8.02721 5.50001C7.82045 5.49924 7.62255 5.58386 7.48026 5.73387L4.1606 9.23387C3.87555 9.53441 3.8881 10.0091 4.18863 10.2942C4.48917 10.5792 4.96388 10.5667 5.24892 10.2661L8.02037 7.34412L10.7472 10.2621C11.03 10.5647 11.5046 10.5808 11.8072 10.298C12.1099 10.0152 12.126 9.54056 11.8431 9.23792L8.5724 5.73792C8.43123 5.58686 8.23396 5.50077 8.02721 5.50001Z"
        fill="currentColor"
      />
    </svg>
  );
};

export const TableChevronDown = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8.02721 10.5C7.82045 10.5008 7.62255 10.4161 7.48026 10.2661L4.1606 6.76613C3.87555 6.46559 3.8881 5.99089 4.18863 5.70584C4.48917 5.42079 4.96388 5.43334 5.24892 5.73387L8.02037 8.65588L10.7472 5.73792C11.03 5.43528 11.5046 5.41921 11.8072 5.70203C12.1099 5.98484 12.126 6.45944 11.8431 6.76208L8.5724 10.2621C8.43123 10.4131 8.23396 10.4992 8.02721 10.5Z"
        fill="currentColor"
      />
    </svg>
  );
};

export const TableExpanderUnchecked = () => {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5.90059 13.6175L11.4393 8.26468L5.90059 2.9118C5.58623 2.60898 5.0859 2.61835 4.78309 2.93271C4.48027 3.24708 4.48963 3.7474 4.804 4.05022L9.16715 8.26468L4.804 12.4838C4.48963 12.7866 4.48027 13.2869 4.78309 13.6013C5.0859 13.9157 5.58623 13.925 5.90059 13.6222V13.6175Z"
        fill="currentColor"
      />
    </svg>
  );
};

export const TableExpanderChecked = () => {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 16 17"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M2.65003 6.66695L8.0029 12.2057L13.3558 6.66695C13.6586 6.35259 13.6492 5.85226 13.3349 5.54944C13.0205 5.24663 12.5202 5.25599 12.2174 5.57035L8.0029 9.9335L3.7838 5.57035C3.48098 5.25599 2.98066 5.24663 2.66629 5.54944C2.35193 5.85226 2.34257 6.35259 2.64538 6.66695H2.65003Z"
        fill="currentColor"
      />
    </svg>
  );
};
