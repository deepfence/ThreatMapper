import { defer } from 'react-router-dom';

import { Home } from './Home';

export type HomeDataType = {
  data: Promise<{
    title: string;
    data: string;
  }>;
};

function delay(t: number, v: unknown) {
  return new Promise(function (resolve) {
    setTimeout(resolve.bind(null, v), t);
  });
}

export const homeLoader = async () => {
  console.log('root loader, loading api data');
  const data = delay(5000, 'test data').then(function () {
    return {
      title: 'This is home',
      data: 'Root Data',
    };
  });

  console.log('data', data);
  return defer({
    data,
  });
};

export const homeAction = async () => {
  console.log('root action, submiting action');
};

export { Home };
