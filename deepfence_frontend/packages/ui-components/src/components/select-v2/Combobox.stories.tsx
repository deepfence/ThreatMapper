import { Meta, StoryFn, StoryObj } from '@storybook/react';
import { startTransition, useMemo, useState } from 'react';

import Button from '@/components/button/Button';
import SlidingModal, {
  SlidingModalCloseButton,
  SlidingModalContent,
} from '@/components/modal/SlidingModal';
import {
  ComboboxV2,
  ComboboxV2Content,
  ComboboxV2Item,
  ComboboxV2Provider,
  ComboboxV2TriggerButton,
  ComboboxV2TriggerInput,
} from '@/components/select-v2/Combobox';

export default {
  title: 'Components/ComboboxV2',
  component: ComboboxV2,
} satisfies Meta<typeof ComboboxV2>;

const list = [
  { label: 'test', value: 'test' },
  { label: 'test2', value: 'test2' },
  { label: 'test3', value: 'test3' },
  { label: 'test4', value: 'test4' },
  { label: 'test5', value: 'test5' },
  { label: 'test6', value: 'test6' },
  { label: 'test7', value: 'test7' },
  { label: 'test8', value: 'test8' },
  { label: 'test9', value: 'test9' },
  { label: 'test10', value: 'test10' },
  { label: 'test11', value: 'test11' },
  { label: 'test12', value: 'test12' },
];

const SingleSelectTemplate: StoryFn<typeof ComboboxV2> = () => {
  const SingleSelect = () => {
    const [searchValue, setSearchValue] = useState('');
    const [selectedValue, setSelectedValue] = useState<string>('');
    const matches = useMemo(() => {
      return list.filter((item) =>
        item.label.toLowerCase().includes(searchValue.toLowerCase()),
      );
    }, [searchValue]);

    return (
      <ComboboxV2Provider
        resetValueOnHide
        selectedValue={selectedValue}
        setSelectedValue={setSelectedValue}
        setValue={(value) => {
          startTransition(() => {
            setSearchValue(value);
          });
        }}
      >
        <ComboboxV2TriggerButton>PropertyName</ComboboxV2TriggerButton>
        <ComboboxV2Content width="fixed" searchPlaceholder="Search...">
          {matches.map((item) => (
            <ComboboxV2Item
              key={item.value}
              value={item.value}
              focusOnHover
              setValueOnClick={false}
              className="menu-item"
            >
              {item.label}
            </ComboboxV2Item>
          ))}
        </ComboboxV2Content>
      </ComboboxV2Provider>
    );
  };
  return <SingleSelect />;
};

export const SingleSelect: StoryObj<typeof ComboboxV2> = {
  render: SingleSelectTemplate,
  args: {},
};

const SingleSelectInputTriggerTemplate: StoryFn<typeof ComboboxV2> = () => {
  const SingleSelect = () => {
    const [searchValue, setSearchValue] = useState('');
    const [selectedValue, setSelectedValue] = useState<string>('');
    const [list, setList] = useState(() =>
      Array.from({ length: 20 }, (_, index) => ({
        label: `Item ${index + 1}`,
        value: `item-${index + 1}`,
      })),
    );
    const [loading, setLoading] = useState(false);
    const matches = useMemo(() => {
      return list.filter((item) =>
        item.label.toLowerCase().includes(searchValue.toLowerCase()),
      );
    }, [searchValue, list]);

    return (
      <ComboboxV2Provider
        resetValueOnHide
        selectedValue={selectedValue}
        setSelectedValue={setSelectedValue}
        setValue={(value) => {
          startTransition(() => {
            setSearchValue(value);
          });
        }}
        loading={loading}
      >
        <ComboboxV2TriggerInput
          getDisplayValue={(selected) => {
            return list.find((item) => item.value === selected)?.label ?? null;
          }}
          placeholder="Select a value"
          color="error"
          helperText="This is a helper text"
          label="This is a label"
        />
        <ComboboxV2Content
          width="anchor"
          searchPlaceholder="Search..."
          onEndReached={() => {
            if (!searchValue.length) {
              setLoading(true);
              setTimeout(() => {
                setList((prev) => [
                  ...prev,
                  ...Array.from({ length: 20 }, (_, index) => ({
                    label: `Item ${prev.length + index + 1}`,
                    value: `item-${prev.length + index + 1}`,
                  })),
                ]);
                setLoading(false);
              }, 1000);
            }
          }}
        >
          {matches.map((item) => (
            <ComboboxV2Item
              key={item.value}
              value={item.value}
              focusOnHover
              setValueOnClick={false}
              className="menu-item"
            >
              {item.label}
            </ComboboxV2Item>
          ))}
        </ComboboxV2Content>
      </ComboboxV2Provider>
    );
  };
  return <SingleSelect />;
};

export const SingleSelectInputTrigger: StoryObj<typeof ComboboxV2> = {
  render: SingleSelectInputTriggerTemplate,
  args: {},
};

const MutliSelectTemplate: StoryFn<typeof ComboboxV2> = () => {
  const MutliSelect = () => {
    const [searchValue, setSearchValue] = useState('');
    const [selectedValue, setSelectedValue] = useState<string[]>([]);
    const [list, setList] = useState(() =>
      Array.from({ length: 20 }, (_, index) => ({
        label: `Item ${index + 1}`,
        value: `item-${index + 1}`,
      })),
    );
    const [loading, setLoading] = useState(false);

    const matches = useMemo(() => {
      return list.filter((item) =>
        item.label.toLowerCase().includes(searchValue.toLowerCase()),
      );
    }, [searchValue, list]);

    return (
      <ComboboxV2Provider
        resetValueOnHide
        selectedValue={selectedValue}
        setSelectedValue={setSelectedValue}
        setValue={(value) => {
          startTransition(() => {
            setSearchValue(value);
          });
        }}
        name="testCombobox"
        loading={loading}
      >
        <ComboboxV2TriggerButton>PropertyName</ComboboxV2TriggerButton>
        <ComboboxV2Content
          width="fixed"
          clearButtonContent={'Clear'}
          searchPlaceholder="Search..."
          onEndReached={() => {
            if (!searchValue.length) {
              setLoading(true);
              setTimeout(() => {
                setList((prev) => [
                  ...prev,
                  ...Array.from({ length: 20 }, (_, index) => ({
                    label: `Item ${prev.length + index + 1}`,
                    value: `item-${prev.length + index + 1}`,
                  })),
                ]);
                setLoading(false);
              }, 1000);
            }
          }}
        >
          {matches.map((item) => (
            <ComboboxV2Item
              key={item.value}
              value={item.value}
              focusOnHover
              setValueOnClick={false}
              className="menu-item"
            >
              {item.label}
            </ComboboxV2Item>
          ))}
        </ComboboxV2Content>
      </ComboboxV2Provider>
    );
  };
  return <MutliSelect />;
};

export const MutliSelect: StoryObj<typeof ComboboxV2> = {
  render: MutliSelectTemplate,
  args: {},
};

const MutliSelectInputTriggerTemplate: StoryFn<typeof ComboboxV2> = () => {
  const MutliSelectInputTrigger = () => {
    const [searchValue, setSearchValue] = useState('');
    const [selectedValue, setSelectedValue] = useState<string[]>([]);
    const matches = useMemo(() => {
      return list.filter((item) =>
        item.label.toLowerCase().includes(searchValue.toLowerCase()),
      );
    }, [searchValue]);

    return (
      <ComboboxV2Provider
        resetValueOnHide
        selectedValue={selectedValue}
        setSelectedValue={setSelectedValue}
        setValue={(value) => {
          startTransition(() => {
            setSearchValue(value);
          });
        }}
      >
        <ComboboxV2TriggerInput
          getDisplayValue={(selected) => {
            return `${(selected as string[]).length} selected`;
          }}
          placeholder="Select a value"
          color="error"
          helperText="This is a helper text"
          label="This is a label"
        />
        <ComboboxV2Content
          width="anchor"
          clearButtonContent={'Clear'}
          searchPlaceholder="Search..."
        >
          {matches.map((item) => (
            <ComboboxV2Item key={item.value} value={item.value} setValueOnClick={false}>
              {item.label}
            </ComboboxV2Item>
          ))}
        </ComboboxV2Content>
      </ComboboxV2Provider>
    );
  };
  return <MutliSelectInputTrigger />;
};

export const MutliSelectInputTrigger: StoryObj<typeof ComboboxV2> = {
  render: MutliSelectInputTriggerTemplate,
  args: {},
};

const MultiSelectTemplateInsideDialog: StoryFn<typeof ComboboxV2> = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [selectedValue, setSelectedValue] = useState<string[]>([]);
  const matches = useMemo(() => {
    return list.filter((item) =>
      item.label.toLowerCase().includes(searchValue.toLowerCase()),
    );
  }, [searchValue]);

  return (
    <>
      <Button onClick={() => setDialogOpen(true)}>Open Modal</Button>
      <SlidingModal open={dialogOpen} onOpenChange={setDialogOpen}>
        <SlidingModalCloseButton />
        <SlidingModalContent>
          <div className="p-2 mt-12">
            <ComboboxV2Provider
              resetValueOnHide
              selectedValue={selectedValue}
              setSelectedValue={setSelectedValue}
              setValue={(value) => {
                startTransition(() => {
                  setSearchValue(value);
                });
              }}
            >
              <ComboboxV2TriggerInput
                getDisplayValue={(selected) => {
                  return `${(selected as string[]).length} selected`;
                }}
                placeholder="Select a value"
                color="error"
                helperText="This is a helper text"
                label="This is a label"
              />
              <ComboboxV2Content
                width="anchor"
                clearButtonContent={'Clear'}
                searchPlaceholder="Search..."
              >
                {matches.map((item) => (
                  <ComboboxV2Item
                    key={item.value}
                    value={item.value}
                    focusOnHover
                    setValueOnClick={false}
                    className="menu-item"
                  >
                    {item.label}
                  </ComboboxV2Item>
                ))}
              </ComboboxV2Content>
            </ComboboxV2Provider>
          </div>
        </SlidingModalContent>
      </SlidingModal>
    </>
  );
};

export const MultiSelectInsideDialog: StoryObj<typeof ComboboxV2> = {
  render: MultiSelectTemplateInsideDialog,
  args: {},
};
