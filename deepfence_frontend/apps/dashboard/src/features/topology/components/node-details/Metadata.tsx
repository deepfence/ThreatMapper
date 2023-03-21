import { TruncatedText } from '@/components/TruncatedText';

export const Metadata = ({ data }: { data: Record<string, string> }) => {
  const keys = Object.keys(data);
  return (
    <div className="flex flex-wrap justify-between gap-x-2 gap-y-4">
      {keys.map((key) => (
        <div
          key={key}
          className="flex flex-1 basis-[48%] min-w-[48%] max-w-full flex-col gap-1/2"
        >
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
            {key.replaceAll('_', ' ')}
          </div>
          <div className="text-gray-900 dark:text-white">
            <TruncatedText text={data[key]} />
          </div>
        </div>
      ))}
    </div>
  );
};
