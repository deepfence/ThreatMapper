import { FaArrowRight } from 'react-icons/fa';
import { Button, Switch, TextInput } from 'ui-components';

export const AddECRForm = () => {
  return (
    <>
      <div className="w-full relative p-5 mt-2">
        <TextInput
          className="min-[200px] max-w-xs"
          label="Registry Name"
          type={'text'}
          sizing="sm"
          name="registryName"
          placeholder="Registry Name"
        />
        <div className="flex flex-col gap-4 mt-6">
          <Switch label="Public Registry Information" />
          <Switch label="Use AWS IAM Role" />
        </div>
        <TextInput
          className="min-[200px] max-w-xs mt-6"
          label="AWS Access Key"
          type={'text'}
          sizing="sm"
          name="awsAccessKey"
          placeholder="AWS Access Key"
        />
        <TextInput
          className="min-[200px] max-w-xs mt-6"
          label="AWS Secret Key"
          type={'text'}
          sizing="sm"
          name="awsSecretKey"
          placeholder="AWS Secret Key"
        />
        <TextInput
          className="min-[200px] max-w-xs mt-6"
          label="AWS Region"
          type={'text'}
          sizing="sm"
          name="awsRegion"
          placeholder="AWS Region"
        />
        {/* </div> */}
        <Button
          color="primary"
          size="xs"
          className="min-[200px] max-w-xs mt-12"
          endIcon={<FaArrowRight />}
        >
          Add Registry
        </Button>
      </div>
    </>
  );
};
