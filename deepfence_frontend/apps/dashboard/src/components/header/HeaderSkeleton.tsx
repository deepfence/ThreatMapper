export const SquareSkeleton = () => {
  return <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>;
};
export const RectSkeleton = ({ width, height }: { width: string; height: string }) => {
  return (
    <div
      className={`p-2 ${height} ${width} bg-gray-200 dark:bg-gray-700 rounded-md`}
    ></div>
  );
};
export const TimestampSkeleton = () => {
  return (
    <div>
      <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded"></div>
      <div className="mt-1 h-2 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
    </div>
  );
};
export const HeaderSkeleton = ({
  RightSkeleton,
  LeftSkeleton,
}: {
  RightSkeleton: React.ReactNode;
  LeftSkeleton: React.ReactNode;
}) => {
  return (
    <div className="flex items-center w-full">
      <div className="flex gap-x-4">{LeftSkeleton}</div>
      <div className="flex ml-auto gap-x-4">{RightSkeleton}</div>
    </div>
  );
};
