import { Checkbox } from '../../components/checkbox/Checkbox';
import { useTheme } from '../../theme/ThemeContext';
import { useRepoData } from './hooks';

export const Example = () => {
  const { isLoading, error, data } = useRepoData();
  const { toggleMode } = useTheme();

  if (isLoading) return <span>Loading...</span>;

  if (error) return <span>{`Error: ${error.message}`}</span>;

  return (
    <div>
      <h1>UserId: {data?.userId}</h1>
      <div className="p-9">
        <Checkbox />
      </div>
      <button
        onClick={() => {
          toggleMode?.();
        }}
        className="bg-teal-600 dark:bg-slate-300"
      >
        toggle theme
      </button>
    </div>
  );
};
