import { Meta, StoryFn } from '@storybook/react';
import cx from 'classnames';

import { Typography } from '@/components/typography/Typography';

const Dummy = () => null;

export default {
  /* 👇 The title prop is optional.
   * See https://storybook.js.org/docs/react/configure/overview#configure-story-loading
   * to learn how to generate automatic titles
   */
  title: 'Components/Typography',
} as Meta<typeof Dummy>;

const lorem =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum';

export const typography: StoryFn<typeof Dummy> = () => (
  <div className="text-gray-900 dark:text-gray-400">
    <h1 style={{ fontWeight: 600, fontSize: '2rem' }}>Font weight</h1>
    <div>
      <div>▶ weight-100(Typography.weight.thin)</div>
      <div className={cx(Typography.weight.thin)}>{lorem}</div>
    </div>
    <br />
    <div>
      <div>▶ weight-200(Typography.weight.extralight)</div>
      <div className={cx(Typography.weight.extralight)}>{lorem}</div>
    </div>
    <br />
    <div>
      <div>▶ weight-300(Typography.weight.light)</div>
      <div className={cx(Typography.weight.light)}>{lorem}</div>
    </div>
    <br />
    <div>
      <div>▶ weight-400(Typography.weight.normal)</div>
      <div className={cx(Typography.weight.normal)}>{lorem}</div>
    </div>
    <br />
    <div>
      <div>▶ weight-500(Typography.weight.medium)</div>
      <div className={cx(Typography.weight.medium)}>{lorem}</div>
    </div>
    <br />
    <div>
      <div>▶ weight-600(Typography.weight.semibold)</div>
      <div className={cx(Typography.weight.semibold)}>{lorem}</div>
    </div>
    <br />
    <div>
      <div>▶ weight-700(Typography.weight.bold)</div>
      <div className={cx(Typography.weight.bold)}>{lorem}</div>
    </div>
    <br />
    <div>
      <div>▶ weight-800(Typography.weight.extrabold)</div>
      <div className={cx(Typography.weight.extrabold)}>{lorem}</div>
    </div>
    <br />
    <div>
      <div>▶ weight-900(Typography.weight.black)</div>
      <div className={cx(Typography.weight.black)}>{lorem}</div>
    </div>
    <br />
    <hr />
    <br />
    <h1 style={{ fontWeight: 600, fontSize: '2rem' }}>Font size</h1>
    <div>
      <div>▶ size-0.75rem-12px(Typography.size.xs)</div>
      <div className={cx(Typography.size.xs)}>{lorem}</div>
    </div>
    <br />
    <div>
      <div>▶ size-0.875rem-14px(Typography.size.sm)</div>
      <div className={cx(Typography.size.sm)}>{lorem}</div>
    </div>
    <br />
    <div>
      <div>▶ size-1rem-16px(Typography.size.base)</div>
      <div className={cx(Typography.size.base)}>{lorem}</div>
    </div>
    <br />
    <div>
      <div>▶ size-1.125rem-18px(Typography.size.lg)</div>
      <div className={cx(Typography.size.lg)}>{lorem}</div>
    </div>
    <br />
    <div>
      <div>▶ size-1.25rem-20px(Typography.size.xl)</div>
      <div className={cx(Typography.size.xl)}>{lorem}</div>
    </div>
    <br />
    <div>
      <div>▶ size-1.5rem-24px(Typography.size.2xl)</div>
      <div className={cx(Typography.size['2xl'])}>{lorem}</div>
    </div>
    <br />
    <div>
      <div>▶ size-1.875rem-30px(Typography.size.3xl)</div>
      <div className={cx(Typography.size['3xl'])}>{lorem}</div>
    </div>
    <br />
    <div>
      <div>▶ size-2.25rem-36px(Typography.size.4xl)</div>
      <div className={cx(Typography.size['4xl'])}>{lorem}</div>
    </div>
    <br />
    <div>
      <div>▶ size-3rem-48px(Typography.size.5xl)</div>
      <div className={cx(Typography.size['5xl'])}>{lorem}</div>
    </div>
    <br />
    <div>
      <div>▶ size-3.75rem-60px(Typography.size.6xl)</div>
      <div className={cx(Typography.size['6xl'])}>{lorem}</div>
    </div>
    <br />
    <div>
      <div>▶ size-4.5rem-72px(Typography.size.7xl)</div>
      <div className={cx(Typography.size['7xl'])}>{lorem}</div>
    </div>
    <br />
    <div>
      <div>▶ size-6rem-96px(Typography.size.8xl)</div>
      <div className={cx(Typography.size['8xl'])}>{lorem}</div>
    </div>
    <br />
    <div>
      <div>▶ size-8rem-128px(Typography.size.9xl)</div>
      <div className={cx(Typography.size['9xl'])}>{lorem}</div>
    </div>
    <br />
    <hr />
    <br />
    <h1 style={{ fontWeight: 600, fontSize: '2rem' }}>Text decoration</h1>
    <div>
      <div>▶ line through(Typography.decoration.lineThrough)</div>
      <div className={cx(Typography.decoration.lineThrough)}>{lorem}</div>
    </div>
    <br />
    <div>
      <div>▶ underline(Typography.decoration.underline)</div>
      <div className={cx(Typography.decoration.underline)}>{lorem}</div>
    </div>
    <br />
    <div>
      <div>▶ uppercase(Typography.decoration.uppercase)</div>
      <div className={cx(Typography.decoration.uppercase)}>{lorem}</div>
    </div>
    <br />
    <hr />
    <br />
    <h1 style={{ fontWeight: 600, fontSize: '2rem' }}>Line height</h1>
    <div>
      <div>▶ leading none(Typography.leading.none)</div>
      <div className={cx(Typography.leading.none)}>{lorem}</div>
    </div>
    <br />
    <div>
      <div>▶ leading normal(Typography.leading.normal)</div>
      <div className={cx(Typography.leading.normal)}>{lorem}</div>
    </div>
    <br />
    <div>
      <div>▶ leading loose(Typography.leading.loose)</div>
      <div className={cx(Typography.leading.loose)}>{lorem}</div>
    </div>
    <br />
  </div>
);
