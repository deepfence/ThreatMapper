import { Button } from 'ui-components';

import { ArrowLine } from '@/components/icons/common/ArrowLine';
import {
  deleteNudgeCollapsedTimeFromStorage,
  NudgeValue,
  setNudgeCollapsedTimeToStorage,
  useNudgeValue,
} from '@/features/common/components/NudgeContext';

export const Nudges = () => {
  const { nudgeValue, setNudgeValue } = useNudgeValue();
  if (!nudgeValue) return null;
  return nudgeValue.collapsed ? (
    <button
      className="fixed bottom-2 right-2 h-[70px] w-[70px]"
      onClick={() => {
        deleteNudgeCollapsedTimeFromStorage(nudgeValue.id);
        setNudgeValue({ ...nudgeValue, collapsed: false });
      }}
    >
      <ShieldCheckSolidIcon />
    </button>
  ) : (
    <ExpandedNudge
      nudge={nudgeValue}
      onCollapse={() => {
        setNudgeCollapsedTimeToStorage(nudgeValue.id);
        setNudgeValue({ ...nudgeValue, collapsed: true });
      }}
    />
  );
};

const ExpandedNudge = (props: { nudge: NudgeValue; onCollapse: () => void }) => {
  return (
    <>
      <div className="fixed inset-0 dark:bg-bg-left-nav opacity-70 z-40" />
      <div className="fixed w-[282px] bottom-6 right-6 dark:bg-bg-side-panel flex flex-col items-center rounded-[5px] px-[16px] pb-[20px] z-50">
        <button
          className="absolute h-3 w-3 top-[14px] right-[14px] dark:text-[#ADBBC4]"
          onClick={props.onCollapse}
        >
          <DismissIcon />
        </button>
        <div className="h-[150px] w-[150px] shrink-0 mt-[24px]">
          <ShieldCheckSolidIcon />
        </div>
        <div className="mt-[12px] text-h3 dark:text-text-input-value text-center">
          {props.nudge.title}
        </div>
        <div className="mt-[6px] text-p1 dark:text-text-text-and-icon text-center">
          {props.nudge.text}
        </div>
        <div className="mt-1">
          <Button
            color="success"
            endIcon={
              <div className="rotate-90">
                <ArrowLine />
              </div>
            }
          >
            Get enterprise edition
          </Button>
        </div>
      </div>
    </>
  );
};

const ShieldCheckSolidIcon = () => {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 149 149"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g filter="url(#filter0_d_16_5495)">
        <circle cx="74.5" cy="74.5" r="57.5" fill="#11223B" />
        <circle cx="74.5" cy="74.5" r="56.5" stroke="#15B77E" strokeWidth="2" />
      </g>
      <g filter="url(#filter1_d_16_5495)">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M86.1025 53.4167C89.8478 55.0156 93.7219 56.3254 97.6875 57.3333L99 57.65V71.55C99 93.8833 75.34 102.3 75.095 102.3L74.5 102.5L73.905 102.3C73.9032 102.299 73.9 102.298 73.8953 102.296C73.3064 102.084 50 93.6911 50 71.55V57.65L51.3125 57.3333C55.2835 56.3316 59.1635 55.0274 62.915 53.4333C66.5997 51.911 70.1568 50.1225 73.555 48.0833L74.5 47.5L75.4625 48.0667C78.8607 50.1058 82.4178 51.8944 86.1025 53.4167ZM74.5 98.9333C78 97.5667 95.5 89.8833 95.5 71.55V60.2333C91.8084 59.2226 88.1948 57.9696 84.685 56.4833C81.175 55.0383 77.7722 53.3678 74.5 51.4833C71.2278 53.3678 67.825 55.0383 64.315 56.4833C60.8052 57.9696 57.1916 59.2226 53.5 60.2333V71.55C53.5 89.8667 71 97.5667 74.5 98.9333Z"
          fill="#15B77E"
        />
      </g>
      <g filter="url(#filter2_d_16_5495)">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M82.1757 60.7222C84.6533 61.78 87.2162 62.6464 89.8396 63.3132L90.7079 63.5227V72.7181C90.7079 87.4925 75.0559 93.0604 74.8938 93.0604L74.5002 93.1927L74.1066 93.0604C74.1054 93.06 74.1032 93.0592 74.1001 93.0581C73.7107 92.9178 58.2925 87.3653 58.2925 72.7181V63.5227L59.1607 63.3132C61.7877 62.6506 64.3545 61.7878 66.8363 60.7332C69.2738 59.7262 71.627 58.543 73.875 57.194L74.5002 56.8081L75.1369 57.183C77.385 58.5319 79.7381 59.7151 82.1757 60.7222ZM71.6175 82.6081L84.5489 70.6453L84.6068 70.5902C85.0204 70.1962 85.182 69.6221 85.0306 69.084C84.8792 68.5459 84.4379 68.1256 83.8729 67.9815C83.3079 67.8373 82.705 67.9911 82.2914 68.385L71.6522 78.3081L66.6163 73.4237C65.9769 72.8148 64.9403 72.8148 64.3009 73.4237C63.6615 74.0327 63.6615 75.0199 64.3009 75.6289L71.6175 82.6081Z"
          fill="#15B77E"
        />
      </g>
      <defs>
        <filter
          id="filter0_d_16_5495"
          x="0"
          y="0"
          width="149"
          height="149"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feMorphology
            radius="1"
            operator="dilate"
            in="SourceAlpha"
            result="effect1_dropShadow_16_5495"
          />
          <feOffset />
          <feGaussianBlur stdDeviation="8" />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.184314 0 0 0 0 0.74902 0 0 0 0 0.619608 0 0 0 0.72 0"
          />
          <feBlend
            mode="normal"
            in2="BackgroundImageFix"
            result="effect1_dropShadow_16_5495"
          />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="effect1_dropShadow_16_5495"
            result="shape"
          />
        </filter>
        <filter
          id="filter1_d_16_5495"
          x="41"
          y="43"
          width="71"
          height="68"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dx="2" dy="2" />
          <feGaussianBlur stdDeviation="2" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"
          />
          <feBlend
            mode="normal"
            in2="BackgroundImageFix"
            result="effect1_dropShadow_16_5495"
          />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="effect1_dropShadow_16_5495"
            result="shape"
          />
        </filter>
        <filter
          id="filter2_d_16_5495"
          x="51.6616"
          y="53.1543"
          width="49.6768"
          height="47.6923"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dx="2" dy="2" />
          <feGaussianBlur stdDeviation="2" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"
          />
          <feBlend
            mode="normal"
            in2="BackgroundImageFix"
            result="effect1_dropShadow_16_5495"
          />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="effect1_dropShadow_16_5495"
            result="shape"
          />
        </filter>
      </defs>
    </svg>
  );
};

const DismissIcon = () => {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g id="dismiss">
        <path
          id="Shape"
          fillRule="evenodd"
          clipRule="evenodd"
          d="M6.88173 5.98639L11.8557 1.0257C12.0596 0.788284 12.0459 0.434373 11.8243 0.213345C11.6026 -0.00768377 11.2478 -0.0213538 11.0097 0.181967L6.03573 5.14266L1.06174 0.175983C0.82647 -0.0586609 0.445018 -0.0586609 0.209745 0.175983C-0.025528 0.410626 -0.025528 0.791059 0.209745 1.0257L5.18974 5.98639L0.209745 10.9471C0.0385195 11.0933 -0.0360639 11.3229 0.0166591 11.5415C0.0693821 11.7601 0.240513 11.9308 0.459693 11.9834C0.678873 12.036 0.90911 11.9616 1.05574 11.7908L6.03573 6.83013L11.0097 11.7908C11.2478 11.9941 11.6026 11.9805 11.8243 11.7594C12.0459 11.5384 12.0596 11.1845 11.8557 10.9471L6.88173 5.98639Z"
          fill="currentColor"
        />
      </g>
    </svg>
  );
};
