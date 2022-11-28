import { Button, Card, TextInput } from 'ui-components';

export const Login = () => {
  return (
    <Card className="w-80 p-3 h-96">
      <TextInput
        label="Username"
        type={'text'}
        placeholder="Username"
        sizing="sm"
        name="email"
      />
      <TextInput
        label="Password"
        type={'password'}
        placeholder="Password"
        className="py-2"
        sizing="sm"
        name="password"
      />
      <div className="flex flex-col w-full py-5">
        <Button size="sm" color="primary" className="w-full">
          Login
        </Button>
      </div>
    </Card>
  );
};
