import { ComponentMeta, ComponentStory } from '@storybook/react';
import { useEffect, useState } from 'react';

import { Combobox, ComboboxOption, ItemType } from '@/components/select/Combobox';
import { fetchData } from '@/components/select/searchApi';

export default {
  title: 'Components/Combobox',
  component: Combobox,
} as ComponentMeta<typeof Combobox>;

const Template: ComponentStory<typeof Combobox> = () => {
  const [selected, setSelected] = useState<ItemType[]>([]);
  const [options, setOptions] = useState<any[]>([]);
  const [offset, setOffset] = useState(1);

  const [query, setQuery] = useState('');

  useEffect(() => {
    fetchData(offset, query).then((res) => {
      setOptions((oldItems) => [...oldItems, ...res]);
    });
  }, [offset, query]);

  const onScroll = () => {
    setOffset((c) => c + 1);
  };
  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
    setOptions([]);
  };

  const onSelect = (item: ItemType) => {
    console.log('selected item', item);
    setSelected(item);
  };

  return (
    <Combobox
      sizing="sm"
      value={selected}
      onScroll={onScroll}
      multiple={true}
      label="Select your value"
      onChange={onChange}
      onSelect={onSelect}
    >
      {options.map((person, index) => {
        return <ComboboxOption key={index} item={person} />;
      })}
    </Combobox>
  );
};

export const Default = Template.bind({});
Default.args = {};
