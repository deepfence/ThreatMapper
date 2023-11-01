import { useState } from 'react';
import { cn } from 'tailwind-preset';

import { Listbox, ListboxOption } from '@/main';

const PERIOD = ['Week', 'Day', 'Hour'] as const;
const daysMapToNumber = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};
const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

type DaysType = (typeof DAYS_OF_WEEK)[number];

const HOURS = Array.from(Array(24).keys());
const MINUTES = Array.from(Array(60).keys());

type ScheduleProps = {
  variant?: 'underline' | 'default';
  defaultPeriod?: (typeof PERIOD)[number];
  defaultDaysOfWeek?: DaysType[];
  defaultHours?: number[];
  defaultMinute?: number;
  className?: string;
  onPeriodChange?: (period: (typeof PERIOD)[number]) => void;
  onDaysOfWeekChange?: (days: number[]) => void;
  onHourChange?: (hour: number[]) => void;
  onMinuteChange?: (minute: number) => void;
};

const DaysOfWeek = (props: ScheduleProps) => {
  const { variant, defaultDaysOfWeek, onDaysOfWeekChange } = props;
  const [daysOfWeek, setDaysOfWeek] = useState<string[]>(defaultDaysOfWeek ?? []);

  return (
    <div className="min-w-[120px]">
      <Listbox
        multiple
        variant={variant}
        label={'On'}
        name="scheduleOn"
        value={daysOfWeek}
        defaultValue={(defaultDaysOfWeek ?? [DAYS_OF_WEEK[0]]) as string[]}
        getDisplayValue={() => (daysOfWeek.length > 1 ? 'days' : daysOfWeek[0])}
        onChange={(values) => {
          setDaysOfWeek(values);
          onDaysOfWeekChange?.(values.map((value) => daysMapToNumber[value as DaysType]));
        }}
      >
        {DAYS_OF_WEEK.map((day) => {
          return (
            <ListboxOption key={`${day}`} value={day}>
              {day}
            </ListboxOption>
          );
        })}
      </Listbox>
    </div>
  );
};

const Hours = (props: ScheduleProps) => {
  const { variant, defaultHours, onHourChange } = props;
  const [hours, setHours] = useState<number[]>(defaultHours ?? [0]);

  return (
    <div className="min-w-[120px]">
      <Listbox
        multiple
        variant={variant}
        label={'Hours'}
        name="scheduleHour"
        value={hours}
        defaultValue={defaultHours ?? [0]}
        getDisplayValue={() => (hours.length > 1 ? 'hours' : hours[0].toString())}
        onChange={(values) => {
          setHours(values);
          onHourChange?.(values);
        }}
      >
        {HOURS.map((hour) => {
          return (
            <ListboxOption key={`${hour}`} value={hour}>
              {hour}
            </ListboxOption>
          );
        })}
      </Listbox>
    </div>
  );
};

const Minutes = (props: ScheduleProps) => {
  const { variant, defaultMinute, onMinuteChange } = props;
  const [minute, setMinute] = useState<number>(defaultMinute ?? 0);

  return (
    <div className="min-w-[60px]">
      <Listbox
        label="Minutes"
        variant={variant}
        name="scheduleMinute"
        value={minute}
        defaultValue={(defaultMinute ?? MINUTES[0]) as number}
        getDisplayValue={() => minute?.toString() ?? ''}
        onChange={(values) => {
          setMinute(values);
          onMinuteChange?.(values);
        }}
      >
        {MINUTES.map((minute) => {
          return (
            <ListboxOption key={`${minute}`} value={minute}>
              {minute}
            </ListboxOption>
          );
        })}
      </Listbox>
    </div>
  );
};

export const Schedule = (props: ScheduleProps) => {
  const { variant, defaultPeriod, className, onPeriodChange } = props;
  const [period, setPeriod] = useState<string>(defaultPeriod ?? '');

  return (
    <div className={cn('flex flex-wrap gap-x-2 gap-y-6', className)}>
      <div className="min-w-[80px]">
        <Listbox
          variant={variant}
          label={'Every'}
          name="schedulePeriod"
          value={period}
          defaultValue={defaultPeriod}
          getDisplayValue={() => period}
          onChange={(values) => {
            setPeriod(values);
            onPeriodChange?.(values as (typeof PERIOD)[number]);
          }}
        >
          {PERIOD.map((period) => {
            return (
              <ListboxOption key={`${period}`} value={period}>
                {period}
              </ListboxOption>
            );
          })}
        </Listbox>
      </div>

      {period === PERIOD[0] && (
        <>
          <DaysOfWeek {...props} />
          <Hours {...props} />
          <span className="text-p3 text-text-text-and-icon dark:text-text-text-and-icon flex justify-end items-end pb-2">
            :
          </span>
          <Minutes {...props} />
        </>
      )}
      {period === PERIOD[1] && (
        <>
          <Hours {...props} />
          <span className="text-p3 text-text-text-and-icon dark:text-text-text-and-icon flex justify-end items-end pb-2">
            :
          </span>
          <Minutes {...props} />
        </>
      )}
      {period === PERIOD[2] && (
        <>
          <Minutes {...props} />
        </>
      )}
    </div>
  );
};
