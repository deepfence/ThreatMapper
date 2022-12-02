import { useRouteError } from 'react-router-dom';
import { Typography } from 'ui-components';

export const RootRouteError = () => {
  const error = useRouteError() as Error;
  console.warn(error.message);
  return (
    <div>
      <h1 className={`${Typography.size['6xl']} ${Typography.weight.bold}`}>
        <pre>Please try in sometime.</pre>
      </h1>
    </div>
  );
};
