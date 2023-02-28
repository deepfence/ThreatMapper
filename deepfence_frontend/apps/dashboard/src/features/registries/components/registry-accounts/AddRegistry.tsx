import { FaPlus } from 'react-icons/fa';
import { TextInput } from 'ui-components';

export const AddRegistry = () => {
  return <TextInput onChange={() => {}} placeholder="Registry Name" />;
};

export const AddRegistryHeader = () => {
  // header with icon
  return (
    <div className="flex">
      <FaPlus /> Add Registry
    </div>
  );
};
