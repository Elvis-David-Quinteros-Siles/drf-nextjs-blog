export default function LoadingPostCard() {
  return (
    <div
      aria-hidden="true"
      className="overflow-hidden rounded-2xl border border-gray-200 dark:border-dark-third"
    >
      <div className="aspect-[1200/630] animate-pulse bg-gray-200 dark:bg-dark-second" />
      <div className="space-y-3 p-6">
        <div className="h-5 w-24 animate-pulse rounded-full bg-gray-200 dark:bg-dark-second" />
        <div className="h-5 w-11/12 animate-pulse rounded bg-gray-200 dark:bg-dark-second" />
        <div className="h-4 w-full animate-pulse rounded bg-gray-100 dark:bg-dark-second/60" />
        <div className="h-4 w-4/5 animate-pulse rounded bg-gray-100 dark:bg-dark-second/60" />
      </div>
    </div>
  );
}
