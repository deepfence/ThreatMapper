import { ComponentMeta, ComponentStory } from '@storybook/react';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './Accordion';

export default {
  title: 'Components/Accordion',
  component: Accordion,
} as ComponentMeta<typeof Accordion>;

const Items = [`Lorem Ipsum is simply dummy text of the printing and typesetting industry.`, 'Item 2', 'Item 3'];

const DefaultTemplate: ComponentStory<typeof Accordion> = (args) => {
  return (
    <Accordion {...args} className="w-1/2">
      {Items.map((item: string) => {
        return (
          <AccordionItem value={item} key={item}>
            <AccordionTrigger>Click {item}</AccordionTrigger>
            <AccordionContent>{`Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, 
              when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, 
              remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, 
              and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.`}</AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
};

export const Default = DefaultTemplate.bind({});
Default.args = {
  type: 'multiple',
  defaultValue: ['Item 2'],
};
