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
      <form
        onSubmit={(e) => {
          e.preventDefault();
          console.log('submiting...');
        }}
      >
        <div title="Radio Group" className="p-4 dark:bg-gray-900">
          Your test component
        </div>
      </form>
    </div>
  );
};
