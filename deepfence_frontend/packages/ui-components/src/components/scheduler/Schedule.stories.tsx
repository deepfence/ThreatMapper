import { Meta } from '@storybook/react';
import { arrayToString } from 'cron-converter';
import cronstrue from 'cronstrue';
import { FC, useEffect, useState } from 'react';

import { Schedule as Scheduler } from '@/components/scheduler/Schedule';

export default {
  title: 'Components/Schedule',
  component: Scheduler,
} satisfies Meta<typeof Scheduler>;

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const DAY_OF_MONTHS = Array.from({ length: 31 }, (_, i) => i + 1);

export const Default: FC = () => {
  const [period, setPeriod] = useState<'Week' | 'Day' | 'Hour'>('Week');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1]);
  const [hours, setHours] = useState<number[]>([0]);
  const [minutes, setMinutes] = useState<number>(0);

  useEffect(() => {
    /**
     * [Minute (0 - 59)],
     * [Hour (0 - 23)],
     * [Day of the month (1 - 31)],
     * [Month (1 - 12)],
     * [Day of the week (0 - 7) (Sunday is both 0 and 7)]
     */
    const cronString = arrayToString([
      [minutes],
      hours,
      DAY_OF_MONTHS,
      MONTHS,
      daysOfWeek,
    ]);

    console.log('Text:', cronstrue.toString(cronString));
  }, [period, daysOfWeek, hours, minutes]);

  return (
    <Scheduler
      variant="underline"
      defaultPeriod="Week"
      defaultDaysOfWeek={['Sunday']}
      onPeriodChange={(period) => {
        setPeriod(period);
      }}
      onDaysOfWeekChange={(daysOfWeek) => {
        setDaysOfWeek(daysOfWeek);
      }}
      onHourChange={(hours) => {
        setHours(hours);
      }}
      onMinuteChange={(minute) => {
        setMinutes(minute);
      }}
    />
  );
};
Default.displayName = 'Schedule';
