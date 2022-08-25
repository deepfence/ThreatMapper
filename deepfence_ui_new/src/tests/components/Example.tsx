import { useRepoData } from './hooks';

export const Example = () => {
  const { isLoading, error, data } = useRepoData();
  if (isLoading) return <span>Loading...</span>;

  if (error) return <span>{`Error: ${error.message}`}</span>;

  return (
    <div>
      <h1>UserId: {data?.userId}</h1>
    </div>
  );
};
