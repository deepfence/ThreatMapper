import { HiOutlineChevronRight } from 'react-icons/hi';
import { Button, Card, CircleSpinner, Separator } from 'ui-components';

import {
  TopNSecretChart,
  TopNSecretChartData,
} from '@/features/secrets/components/landing/TopNSecretChart';
import { useTheme } from '@/theme/ThemeContext';
import { usePageNavigation } from '@/utils/usePageNavigation';

const LoadingComponent = () => {
  return (
    <div className="flex items-center justify-center absolute inset-0">
      <CircleSpinner size="xl" />
    </div>
  );
};

export const TopNSecretCard = ({
  data,
  loading,
  title,
  link,
}: {
  data: Array<TopNSecretChartData>;
  loading?: boolean;
  title: string;
  link: string;
}) => {
  const { mode } = useTheme();
  const { navigate } = usePageNavigation();
  return (
    <Card className="w-full py-2 px-3 flex flex-col relative">
      <div className="flex items-center pb-2">
        <h4 className="flex-1 text-gray-900 font-medium text-base dark:text-white truncate">
          {title}
        </h4>
        <div className="flex ml-auto">
          <Button
            color="normal"
            size="xs"
            onClick={(e) => {
              e.preventDefault();
              navigate(link);
            }}
          >
            Go to Scans&nbsp;
            <HiOutlineChevronRight />
          </Button>
        </div>
      </div>
      <Separator />
      <div className="basis-60">
        {!loading && <TopNSecretChart theme={mode} data={data} />}
      </div>
      {loading && <LoadingComponent />}
    </Card>
  );
};
