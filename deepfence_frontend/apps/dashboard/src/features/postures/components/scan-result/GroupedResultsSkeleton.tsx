import { Separator } from 'ui-components';

export const RectSkeleton = ({
  width,
  height,
  padding,
}: {
  padding: string;
  width: string;
  height: string;
}) => {
  return (
    <div className={`${padding} ${height} ${width} flex`}>
      <div className={`bg-gray-200 dark:bg-gray-700 rounded-md flex-1 w-1/`}></div>
    </div>
  );
};

export const GroupedResultsSkeleton = () => {
  return (
    <div className="-mt-4">
      <RectSkeleton height="h-8" width="w-[60px]" padding="p-2" />
      <div className="rounded-lg border border-bg-grid-border dark:bg-bg-grid-header bg-white">
        <RectSkeleton height="h-10" width="w-1/2" padding="p-3" />
        <Separator className="border-b border-bg-grid-border" />
        <RectSkeleton height="h-10" width="w-[80%]" padding="p-3" />
        <Separator className="border-b border-bg-grid-border" />
        <RectSkeleton height="h-10" width="w-[70%]" padding="p-3" />
        <Separator className="border-b border-bg-grid-border" />
        <RectSkeleton height="h-10" width="w-[90%]" padding="p-3" />
        <Separator className="border-b border-bg-grid-border" />
        <RectSkeleton height="h-10" width="w-[60%]" padding="p-3" />
        <Separator className="border-b border-bg-grid-border" />
        <RectSkeleton height="h-10" width="w-[80%]" padding="p-3" />
        <Separator className="border-b border-bg-grid-border" />
        <RectSkeleton height="h-10" width="w-[60%]" padding="p-3" />
        <Separator className="border-b border-bg-grid-border" />
        <RectSkeleton height="h-10" width="w-[90%]" padding="p-3" />
        <Separator className="border-b border-bg-grid-border" />
        <RectSkeleton height="h-10" width="w-[70%]" padding="p-3" />
        <Separator className="border-b border-bg-grid-border" />
        <RectSkeleton height="h-10" width="w-[60%]" padding="p-3" />
        <Separator className="border-b border-bg-grid-border" />
        <RectSkeleton height="h-10" width="w-[80%]" padding="p-3" />
        <Separator className="border-b border-bg-grid-border" />
        <RectSkeleton height="h-10" width="w-[60%]" padding="p-3" />
        <Separator className="border-b border-bg-grid-border" />
        <RectSkeleton height="h-10" width="w-[90%]" padding="p-3" />
        <Separator className="border-b border-bg-grid-border" />
        <RectSkeleton height="h-10" width="w-[70%]" padding="p-3" />
        <Separator />
      </div>
    </div>
  );
};
