export type metaheader = {
  key: string;
  value: number;
};
export const Metaheader = ({ metaheader }: { metaheader: metaheader[] }) => {
  return (
    <div className="flex">
      {metaheader.map((m) => {
        return (
          <>
            <div className="pr-6 gap-x-2 flex flex-col justify-center">
              <div className="pr-4 flex items-center gap-x-2">
                <span className="text-lg text-gray-900 dark:text-gray-200 font-semibold">
                  {m.value}
                </span>
              </div>
              <span className="text-xs text-gray-400 dark:text-gray-500">{m.key}</span>
            </div>
          </>
        );
      })}
    </div>
  );
};
