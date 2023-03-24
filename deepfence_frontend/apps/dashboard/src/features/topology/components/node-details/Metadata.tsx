import { TruncatedText } from '@/components/TruncatedText';

export const Metadata = ({
  data,
  title,
}: {
  data: Record<string, string>;
  title?: string;
}) => {
  const keys = Object.keys(data);
  if (!keys.length) return null;
  return (
    <div>
      {title?.length ? (
        <div className="font-semibold text-gray-500 dark:text-gray-400 mb-3">{title}</div>
      ) : null}
      <div className="flex flex-wrap justify-between gap-x-2 gap-y-4 max-w-full">
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
    </div>
  );
};
