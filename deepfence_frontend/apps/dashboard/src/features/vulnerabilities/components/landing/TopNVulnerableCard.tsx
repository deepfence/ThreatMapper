import { HiOutlineChevronRight } from 'react-icons/hi';
import { Card, CircleSpinner, Separator } from 'ui-components';

import { LinkButton } from '@/components/LinkButton';
import {
  TopNVulnerableChart,
  TopNVulnerableChartData,
} from '@/features/vulnerabilities/components/landing/TopNVulnerableChart';
import { useTheme } from '@/theme/ThemeContext';

const LoadingComponent = () => {
  return (
    <div className="flex items-center justify-center absolute inset-0">
      <CircleSpinner size="xl" />
    </div>
  );
};

export const TopNVulnerableCard = ({
  data,
  loading,
  title,
  link,
}: {
  data: Array<TopNVulnerableChartData>;
  loading?: boolean;
  title: string;
  link: string;
}) => {
  const { mode } = useTheme();

  return (
    <Card className="w-full py-2 px-3 flex flex-col relative">
      <div className="flex items-center pb-2">
        <h4 className="flex-1 text-gray-900 font-medium text-base dark:text-white truncate">
          {title}
        </h4>
        <div className="flex ml-auto">
          <LinkButton to={link} sizing="xs">
            <>
              Go to Scans&nbsp;
              <HiOutlineChevronRight />
            </>
          </LinkButton>
        </div>
      </div>
      <Separator />
      <div className="basis-60">
        {!loading && <TopNVulnerableChart theme={mode} data={data} />}
      </div>
      {loading && <LoadingComponent />}
    </Card>
  );
};
