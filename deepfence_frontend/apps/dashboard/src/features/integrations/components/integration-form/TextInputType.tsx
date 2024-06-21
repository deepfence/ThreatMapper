import { TextInput } from 'ui-components';

export const TextInputType = ({
  label,
  name,
  value,
  helperText,
  color,
  type,
  placeholder,
  required,
  defaultValue,
}: {
  label: string;
  name: string;
  value?: string;
  helperText: string;
  color: 'error' | 'default';
  type?: 'text' | 'password';
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
}) => {
  return (
    <TextInput
      className="w-full"
      label={label}
      type={type ?? 'text'}
      name={name}
      placeholder={placeholder ? placeholder : label}
      helperText={helperText}
      color={color}
      required={required}
      value={value}
      defaultValue={defaultValue}
    />
  );
};
