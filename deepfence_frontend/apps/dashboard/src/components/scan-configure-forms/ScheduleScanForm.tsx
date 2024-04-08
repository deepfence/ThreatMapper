import { arrayToString } from 'cron-converter';
import cronstrue from 'cronstrue';
import { useEffect, useState } from 'react';
import { Checkbox, Switch, TextInputArea } from 'ui-components';

import {
  DAYS_OF_MONTH,
  DAYS_OF_WEEK_NUMBER,
  DaysType,
  HOURS,
  MONTHS,
  PERIOD,
  Scheduler,
} from '@/components/scan-configure-forms/Scheduler';

const DefualtHours = [0];
const DefualtMinute = 0;
const DefualtMonths = [1];
const DefaultDaysOfWeekName: DaysType[] = ['Sunday'];
const DefaultDaysOfWeek = [0];

export const ScheduleScanForm = () => {
  const [scheduledScan, setScheduledScan] = useState(false);
  const [cron, setCron] = useState('');
  const [period, setPeriod] = useState<PERIOD>(PERIOD.Week);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(DefaultDaysOfWeek);
  const [daysOfMonth, setDaysOfMonth] = useState<number[]>(DAYS_OF_MONTH);
  const [hours, setHours] = useState<number[]>(DefualtHours);
  const [minutes, setMinutes] = useState<number>(DefualtMinute);

  const [defaultDaysOfWeek, setDefaultDaysOfWeek] =
    useState<DaysType[]>(DefaultDaysOfWeekName);

  const resetStateHoursMinute = () => {
    setHours(DefualtHours);
    setMinutes(DefualtMinute);
  };
  const resetStateForWeek = () => {
    setDefaultDaysOfWeek(DefaultDaysOfWeekName);
    setDaysOfWeek(DefaultDaysOfWeek);
    resetStateHoursMinute();

    // fill * for days of month
    setDaysOfMonth(DAYS_OF_MONTH);
  };

  const resetStateForMonth = () => {
    setDaysOfMonth(DefualtMonths);
    setDefaultDaysOfWeek([]); // reset empty week of days in listbox
    setDaysOfWeek(DAYS_OF_WEEK_NUMBER); // fill * in cron for days of week
    resetStateHoursMinute();
  };

  const resetForDay = () => {
    resetStateHoursMinute();
    // fill * for days of month
    setDaysOfMonth(DAYS_OF_MONTH);
    // fill * in cron for days of week
    setDaysOfWeek(DAYS_OF_WEEK_NUMBER);
  };

  useEffect(() => {
    if (period === PERIOD.Month) {
      resetStateForMonth();
    } else if (period === PERIOD.Week) {
      resetStateForWeek();
    } else if (period === PERIOD.Day) {
      resetForDay();
    } else if (period === PERIOD.Hour) {
      resetForDay();
      setHours(HOURS);
    }
  }, [period]);

  useEffect(() => {
    /**
     * [Minute (0 - 59)],
     * [Hour (0 - 23)],
     * [Day of the month (1 - 31)],
     * [Month (1 - 12)],
     * [Day of the week (0 - 7) (Sunday is both 0 and 7)]
     */

    setCron(arrayToString([[minutes], hours, daysOfMonth, MONTHS, daysOfWeek]));
  }, [period, daysOfMonth, daysOfWeek, hours, minutes]);

  return (
    <div className="flex flex-col mt-6" data-testid="scheduleScanWrapperId">
      <h6 className={'text-p3 text-text-text-and-icon'}>Schedule your scan</h6>
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
          <div className="flex flex-col gap-y-4">
            <p className="text-p4 text-text-text-and-icon">
              {cronstrue.toString(cron)} (All times are in UTC+0)
            </p>
            <input type="text" name="scheduleCron" readOnly hidden value={cron} />
            <Scheduler
              variant="underline"
              defaultPeriod={PERIOD.Week}
              defaultDaysOfWeek={defaultDaysOfWeek}
              onPeriodChange={(period) => {
                setPeriod(period);
              }}
              onDaysOfMonthChange={(daysOfMonth) => {
                setDaysOfMonth(daysOfMonth);
              }}
              onDaysOfWeekChange={(daysOfWeek) => {
                if (daysOfWeek.length === 0) {
                  setDaysOfWeek(DAYS_OF_WEEK_NUMBER);
                } else {
                  setDaysOfWeek(daysOfWeek);
                }
              }}
              onHourChange={(hours) => {
                setHours(hours);
              }}
              onMinuteChange={(minute) => {
                setMinutes(minute);
              }}
            />
          </div>
          <TextInputArea
            name="scheduleDescription"
            placeholder="Enter schedule description"
          />
          <Checkbox label="Scan now" name="scanImmediately" />
        </div>
      )}
    </div>
  );
};
