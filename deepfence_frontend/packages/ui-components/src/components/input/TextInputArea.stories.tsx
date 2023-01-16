import { ComponentMeta, ComponentStory } from '@storybook/react';

import TextInputArea from '@/components/input/TextInputArea';

export default {
  title: 'Components/TextInput/TextInputArea',
  component: TextInputArea,
  argTypes: {
    onChange: { action: 'onChange' },
  },
} as ComponentMeta<typeof TextInputArea>;

const Template: ComponentStory<typeof TextInputArea> = (args) => (
  <TextInputArea {...args} />
);

export const Default = Template.bind({});
Default.args = {};

export const WithPlaceholder = Template.bind({});
WithPlaceholder.args = {
  placeholder: 'Hello Deepfence',
};

export const Disabled = Template.bind({});
Disabled.args = {
  placeholder: 'Disabled...',
  disabled: true,
};

export const WithLabel = Template.bind({});
WithLabel.args = {
  placeholder: 'Hello Deepfence',
  label: 'Comment',
};

export const WithRowsAndColumnn = Template.bind({});
WithRowsAndColumnn.args = {
  placeholder: 'Hello Deepfence',
  label: 'Comment',
  rows: 10,
  cols: 30,
};
