import { LoaderFunctionArgs } from 'react-router-dom';

const loader = ({ request }: LoaderFunctionArgs) => {
  return null;
};

function TopologyCloudTable() {
  return <div>topology cloud table goes here.</div>;
}

export const module = {
  loader,
  element: <TopologyCloudTable />,
};
