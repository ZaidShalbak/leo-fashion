export default function CollectionLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10">
      <div className="space-y-2">
        <div className="bg-muted h-8 w-56 animate-pulse rounded-md" />
        <div className="bg-muted h-4 w-80 animate-pulse rounded-md" />
      </div>
      <div className="bg-muted h-9 w-full max-w-md animate-pulse rounded-md" />
      <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="bg-muted aspect-[4/5] animate-pulse rounded-lg" />
            <div className="bg-muted h-4 w-3/4 animate-pulse rounded-md" />
            <div className="bg-muted h-4 w-1/3 animate-pulse rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
