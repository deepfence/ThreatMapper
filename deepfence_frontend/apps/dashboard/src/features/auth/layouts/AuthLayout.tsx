import { useMemo } from 'react';
import { Outlet } from 'react-router-dom';
import { cn } from 'tailwind-preset';
import { Card } from 'ui-components';

import AuthBg from '@/assets/auth-bg.svg';
import AuthBgLight from '@/assets/auth-bg-light.svg';
import { useTheme } from '@/theme/ThemeContext';

const DeepfenceLogo = () => {
  return (
    <svg
      width="58"
      height="38"
      viewBox="0 0 58 38"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g filter="url(#filter0_d_12160_63483)">
        <path
          d="M26.3597 8.90501L23.3482 5.26385L21.9868 3.64116L18.9753 0H4L8.16667 5.26385H16.83L18.1914 6.84696L20.0891 8.90501L30.1964 21.0158L29 22.4406L17.6964 8.90501L15.7987 6.84696H9.52805L11.4257 8.90501L29 30L32.1353 26.2401L33.3317 24.8153L36.467 21.0158L26.3597 8.90501Z"
          fill="url(#paint0_linear_12160_63483)"
        />
        <path
          d="M41.9125 14.5251L46.5742 8.9051L48.2244 6.92621H35.5181L41.9125 14.5251Z"
          fill="url(#paint1_linear_12160_63483)"
        />
        <path
          d="M32.0115 5.30343H49.5858L49.6271 5.26385L50.9472 3.64116L54 0H21.3267L24.3795 3.64116L25.6997 5.26385L28.7525 8.90501L37.6634 19.591L40.7987 15.8311L40.8399 15.7916L33.3729 6.92612L32.0115 5.30343Z"
          fill="url(#paint2_linear_12160_63483)"
        />
      </g>
      <defs>
        <filter
          id="filter0_d_12160_63483"
          x="0"
          y="0"
          width="58"
          height="38"
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
          <feOffset dy="4" />
          <feGaussianBlur stdDeviation="2" />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"
          />
          <feBlend
            mode="normal"
            in2="BackgroundImageFix"
            result="effect1_dropShadow_12160_63483"
          />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="effect1_dropShadow_12160_63483"
            result="shape"
          />
        </filter>
        <linearGradient
          id="paint0_linear_12160_63483"
          x1="34.914"
          y1="-3.94043e-08"
          x2="35.495"
          y2="31.4707"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0.0955122" stopColor="#00C7F0" />
          <stop offset="1" stopColor="#0157FD" />
        </linearGradient>
        <linearGradient
          id="paint1_linear_12160_63483"
          x1="34.914"
          y1="-3.94043e-08"
          x2="35.495"
          y2="31.4707"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0.0955122" stopColor="#00C7F0" />
          <stop offset="1" stopColor="#0157FD" />
        </linearGradient>
        <linearGradient
          id="paint2_linear_12160_63483"
          x1="34.914"
          y1="-3.94043e-08"
          x2="35.495"
          y2="31.4707"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0.0955122" stopColor="#00C7F0" />
          <stop offset="1" stopColor="#0157FD" />
        </linearGradient>
      </defs>
    </svg>
  );
};
export const AuthLayout = () => {
  const { mode } = useTheme();
  const bg = useMemo(() => {
    if (mode === 'light') {
      return AuthBgLight;
    }
    return AuthBg;
  }, [mode]);

  return (
    <div
      className="grid h-screen place-items-center overflow-auto"
      style={{
        background: `url("${bg}") no-repeat center center`,
        backgroundSize: 'cover',
        // backgroundColor: '#150C58',
      }}
    >
      <div className="relative">
        <div className="h-full grid place-items-center">
          <div className="flex mt-4">
            <DeepfenceLogo />
            <span className="dark:text-text-input-value text-white text-h2 font-normal ml-1">
              Deepfence
            </span>
          </div>
          <Card className={cn('w-[360px] px-14 py-12 my-4 rounded-[15px] bg-bg-page')}>
            <Outlet />
          </Card>
        </div>
      </div>
    </div>
  );
};
