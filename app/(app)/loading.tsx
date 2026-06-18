import { Skeleton, SkeletonRows } from '@/components/ui/states';

/** Route-group loading fallback — shown while a server page streams its data. */
export default function AppLoading() {
  return (
    <div className="mx-auto max-w-[1320px] space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
      <SkeletonRows rows={6} />
    </div>
  );
}
