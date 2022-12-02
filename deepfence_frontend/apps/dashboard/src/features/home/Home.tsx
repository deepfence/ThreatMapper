import { Suspense } from 'react';
import { Await, defer, useLoaderData } from 'react-router-dom';

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
  const data = delay(2000, 'test data').then(function () {
    return {
      title: 'This is home',
      data: 'Root Data',
    };
  });

  return defer({
    data,
  });
};

export const homeAction = async () => {
  console.log('root action, submiting action');
};

export const Home = () => {
  const { data } = useLoaderData() as HomeDataType;

  return (
    <div className="flex flex-col justify-around dark:text-white">
      <div>Home</div>
      <Suspense fallback={<p className="dark:text-white">Loading...</p>}>
        <Await resolve={data}>{(data) => <></>}</Await>
      </Suspense>
    </div>
  );
};
