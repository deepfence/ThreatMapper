import { useState } from 'react';
import { cn } from 'tailwind-preset';
import { Listbox, ListboxOption } from 'ui-components';

export enum PERIOD {
  Month = 'Month',
  Week = 'Week',
  Day = 'Day',
  Hour = 'Hour',
}
const daysMapToNumber: Record<DaysType, DaysOfWeekType> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};
export const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export type DaysType = (typeof DAYS_OF_WEEK)[number];

type Enumerate<N extends number, Acc extends number[] = []> = Acc['length'] extends N
  ? Acc[number]
  : Enumerate<N, [...Acc, Acc['length']]>;

type Range<F extends number, T extends number> = Exclude<Enumerate<T>, Enumerate<F>>;

type HoursType = Range<0, 24>;
type MinutesType = Range<0, 60>;
type DaysOfMonthType = Range<1, 32>;
type DaysOfWeekType = Range<0, 7>;

const MINUTES = Array.from(Array(60).keys());
export const DAYS_OF_MONTH = Array.from({ length: 31 }, (_, i) => i + 1);
export const HOURS = Array.from(Array(24).keys());
export const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
export const DAYS_OF_WEEK_NUMBER = [0, 1, 2, 3, 4, 5, 6];

type ScheduleProps = {
  variant?: 'underline' | 'default';
  defaultPeriod?: PERIOD;
  defaultDaysOfWeek?: DaysType[];
  defaultHours?: HoursType[];
  defaultDaysOfMonth?: DaysOfMonthType[];
  defaultMinute?: MinutesType;
  className?: string;
  onPeriodChange?: (period: PERIOD) => void;
  onMinuteChange?: (minute: MinutesType) => void;
  onHourChange?: (hour: HoursType[]) => void;
  onDaysOfMonthChange?: (daysOfMonth: DaysOfMonthType[]) => void;
  onDaysOfWeekChange?: (days: DaysOfWeekType[]) => void;
};

const DaysOfMonth = (props: ScheduleProps) => {
  const { variant, defaultDaysOfMonth = [1], onDaysOfMonthChange } = props;
  const [daysOfMonth, setDaysOfMonth] = useState<DaysOfMonthType[]>(defaultDaysOfMonth);

  return (
    <div className="min-w-[120px]">
      <Listbox
        multiple
        variant={variant}
        label={'Days of month'}
        name="scheduleMonth"
        value={daysOfMonth}
        defaultValue={defaultDaysOfMonth}
        getDisplayValue={() =>
          daysOfMonth.length > 1 ? 'days' : daysOfMonth[0].toString()
        }
        onChange={(values) => {
          const _values = values.length ? values : defaultDaysOfMonth;
          setDaysOfMonth(_values);
          onDaysOfMonthChange?.(_values);
        }}
      >
        {DAYS_OF_MONTH.map((day) => {
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

const DaysOfWeek = (props: ScheduleProps) => {
  const { variant, defaultDaysOfWeek = [DAYS_OF_WEEK[0]], onDaysOfWeekChange } = props;

  const [daysOfWeek, setDaysOfWeek] = useState<DaysType[]>(defaultDaysOfWeek);

  return (
    <div className="min-w-[120px]">
      <Listbox
        multiple
        variant={variant}
        label={'On'}
        name="scheduleOn"
        value={daysOfWeek}
        getDisplayValue={() => (daysOfWeek.length > 1 ? 'days' : daysOfWeek[0])}
        onChange={(values) => {
          if (defaultDaysOfWeek.length === 0) {
            setDaysOfWeek(values);
            onDaysOfWeekChange?.(values.map((value) => daysMapToNumber[value]));
          } else {
            const _values = values.length ? values : defaultDaysOfWeek;
            setDaysOfWeek(_values);
            onDaysOfWeekChange?.(_values.map((value) => daysMapToNumber[value]));
          }
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
  const { variant, defaultHours = [0], onHourChange } = props;
  const [hours, setHours] = useState<HoursType[]>(defaultHours);

  return (
    <div className="min-w-[120px]">
      <Listbox
        multiple
        variant={variant}
        label={'Hours'}
        name="scheduleHour"
        value={hours}
        defaultValue={defaultHours}
        getDisplayValue={() => (hours.length > 1 ? 'hours' : hours[0].toString())}
        onChange={(values) => {
          const _values = values.length ? values : defaultHours;
          setHours(_values);
          onHourChange?.(_values);
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
  const { variant, defaultMinute = 0, onMinuteChange } = props;
  const [minute, setMinute] = useState<MinutesType>(defaultMinute);

  return (
    <div className="min-w-[60px]">
      <Listbox
        label="Minutes"
        variant={variant}
        name="scheduleMinute"
        value={minute}
        defaultValue={defaultMinute}
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

export const Scheduler = (props: ScheduleProps) => {
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
            onPeriodChange?.(values as PERIOD);
          }}
        >
          {Object.keys(PERIOD).map((period) => {
            return (
              <ListboxOption key={`${period}`} value={period}>
                {period}
              </ListboxOption>
            );
          })}
        </Listbox>
      </div>
      {period === PERIOD.Month && (
        <>
          <DaysOfMonth {...props} />
          <span className="text-p3 text-text-text-and-icon flex justify-end items-end pb-2">
            and
          </span>
          <DaysOfWeek {...props} defaultDaysOfWeek={[]} key={'daysOfMonth'} />
          <Hours {...props} />
          <span className="text-p3 text-text-text-and-icon flex justify-end items-end pb-2">
            :
          </span>
          <Minutes {...props} />
        </>
      )}
      {period === PERIOD.Week && (
        <>
          <DaysOfWeek {...props} defaultDaysOfWeek={[DAYS_OF_WEEK[0]]} key={'week'} />
          <Hours {...props} />
          <span className="text-p3 text-text-text-and-icon flex justify-end items-end pb-2">
            :
          </span>
          <Minutes {...props} />
        </>
      )}
      {period === PERIOD.Day && (
        <>
          <Hours {...props} />
          <span className="text-p3 text-text-text-and-icon flex justify-end items-end pb-2">
            :
          </span>
          <Minutes {...props} />
        </>
      )}
      {period === PERIOD.Hour && (
        <>
          <Minutes {...props} />
        </>
      )}
    </div>
  );
};
