import { arrayToString } from 'cron-converter';
import cronstrue from 'cronstrue';
import { useEffect, useState } from 'react';
import { Checkbox, Schedule, Switch, TextInputArea } from 'ui-components';

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const DAY_OF_MONTHS = Array.from({ length: 31 }, (_, i) => i + 1);

export const ScheduleScanForm = () => {
  // for cron
  const [scheduledScan, setScheduledScan] = useState(false);
  const [crontText, setCronText] = useState('');
  const [period, setPeriod] = useState<'Week' | 'Day' | 'Hour'>('Week');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([0]);
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

    setCronText(cronstrue.toString(cronString));
  }, [period, daysOfWeek, hours, minutes]);

  return (
    <div className="flex flex-col mt-6">
      <h6 className={'text-p3 dark:text-text-text-and-icon'}>Schedule your scan (UTC)</h6>
      <div className="mt-2 mb-4">
        <Switch
          label={scheduledScan ? 'On' : 'Off'}
          onCheckedChange={(on) => setScheduledScan(on)}
          checked={scheduledScan}
          name="scheduleOn"
        />
      </div>
      {scheduledScan && (
        <div className="flex flex-col gap-y-6">
          <div className="flex flex-col gap-y-2">
            <p className="text-p4 dark:text-text-text-and-icon">{crontText}</p>
            <Schedule
              variant="underline"
              defaultPeriod="Week"
              defaultDaysOfWeek={['Sunday']}
              onPeriodChange={() => {
                setCronText('');
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
          </div>
          <TextInputArea name="scheduleDescription" placeholder="Enter description" />
          <Checkbox label="Scan now" name="scanImmediately" />
        </div>
      )}
    </div>
  );
};
