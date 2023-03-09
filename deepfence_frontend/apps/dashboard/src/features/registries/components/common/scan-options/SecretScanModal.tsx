import { useState } from 'react';
import { FaArrowRight } from 'react-icons/fa';
import { Button, Checkbox, Radio, RowSelectionState, TextInput } from 'ui-components';

export const SecretScanModal = ({ selection }: { selection: RowSelectionState }) => {
  const [priorityScan, setPriorityScan] = useState(false);
  const [autoCheckandScan, setAutoCheckandScan] = useState(false);

  return (
    <div className="w-full subpixel-antialiased relative p-5 mt-2">
      <div className="flex text-sm font-semibold flex-col gap-4 ">
        Start a new secret scan for the selected images
      </div>
      <div className="flex mt-4 flex-col gap-4">
        <Checkbox
          label="Priority Scan"
          checked={priorityScan}
          onCheckedChange={(checked: boolean) => {
            setPriorityScan(checked);
          }}
        />
      </div>
      <div className="flex mt-6 flex-col gap-4">
        <Radio
          name="scanby"
          defaultChecked
          defaultValue="last"
          options={[
            { label: 'Scan last pushed tag', value: 'recent' },
            { label: 'Scan by "latest" tag', value: 'last' },
            { label: 'Scan all image tags', value: 'all' },
          ]}
          onValueChange={(value) => {
            console.log('value', value);
          }}
        />
      </div>
      <TextInput
        className="min-[200px] max-w-xs mt-6"
        label="Scan interval in days (optional)"
        type={'text'}
        sizing="sm"
        name="scanInterval"
        placeholder=""
      />
      <div className="flex mt-4 flex-col gap-4">
        <Checkbox
          label="Check and scan for new images every day"
          checked={autoCheckandScan}
          onCheckedChange={(checked: boolean) => {
            setAutoCheckandScan(checked);
          }}
        />
      </div>
      <Button
        color="primary"
        size="sm"
        className="grow w-full mt-12"
        endIcon={<FaArrowRight />}
        onClick={() => {
          console.log('scan now', selection);
        }}
      >
        Scan Now
      </Button>
    </div>
  );
};
