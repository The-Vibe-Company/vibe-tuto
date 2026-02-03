export default function EditorLoading() {
  return (
    <div className="flex h-screen flex-col">
      {/* Header skeleton */}
      <header className="flex h-14 items-center justify-between border-b px-4">
        <div className="flex items-center gap-4">
          <div className="h-8 w-8 animate-pulse rounded bg-gray-200" />
          <div className="h-6 w-48 animate-pulse rounded bg-gray-200" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-20 animate-pulse rounded bg-gray-200" />
          <div className="h-9 w-24 animate-pulse rounded bg-gray-200" />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar skeleton */}
        <aside className="w-64 border-r p-4">
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border p-2">
                <div className="h-12 w-16 animate-pulse rounded bg-gray-200" />
                <div className="flex-1">
                  <div className="h-4 w-16 animate-pulse rounded bg-gray-200" />
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Main content skeleton */}
        <main className="flex flex-1 flex-col p-6">
          <div className="flex-1">
            <div className="aspect-video w-full max-w-4xl animate-pulse rounded-lg bg-gray-200" />
          </div>
          <div className="mt-4">
            <div className="h-32 w-full max-w-4xl animate-pulse rounded-lg bg-gray-200" />
          </div>
        </main>
      </div>
    </div>
  );
}
