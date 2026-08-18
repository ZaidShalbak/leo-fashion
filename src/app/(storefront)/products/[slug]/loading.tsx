export default function ProductLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="grid gap-10 lg:grid-cols-2">
        <div className="bg-muted aspect-[4/5] w-full animate-pulse rounded-lg" />
        <div className="space-y-6">
          <div className="bg-muted h-8 w-2/3 animate-pulse rounded-md" />
          <div className="bg-muted h-6 w-24 animate-pulse rounded-md" />
          <div className="space-y-2">
            <div className="bg-muted h-4 w-16 animate-pulse rounded-md" />
            <div className="flex gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-muted h-9 w-10 animate-pulse rounded-md"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
