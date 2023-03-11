import { useState } from 'react';
import { Form } from 'react-router-dom';
import { Button, Checkbox, Radio, TextInput } from 'ui-components';

export const SecretScanConfigureForm = () => {
  const [priorityScan, setPriorityScan] = useState(false);
  const [autoCheckandScan, setAutoCheckandScan] = useState(false);

  return (
    <Form className="flex flex-col">
      <div className="flex">
        <h6 className={'text-md font-medium dark:text-white'}>Advanced Options</h6>
        <Button
          // disabled={loading}
          // loading={loading}
          size="sm"
          color="primary"
          className="ml-auto"
          type="submit"
        >
          Start Scan
        </Button>
      </div>
      <div className="flex flex-col gap-y-6">
        <Checkbox
          label="Priority Scan"
          checked={priorityScan}
          onCheckedChange={(checked: boolean) => {
            setPriorityScan(checked);
          }}
        />
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
        <TextInput
          className="min-[200px] max-w-xs"
          label="Scan interval in days (optional)"
          type={'text'}
          sizing="sm"
          name="scanInterval"
          placeholder=""
        />
        <Checkbox
          label="Check and scan for new images every day"
          checked={autoCheckandScan}
          onCheckedChange={(checked: boolean) => {
            setAutoCheckandScan(checked);
          }}
        />
      </div>
    </Form>
  );
};
