export default function GameLoading() {
  return (
    <div className="space-y-4 animate-pulse p-6">
      <div className="h-8 bg-muted/40 rounded-lg w-48" />
      <div className="h-4 bg-muted/30 rounded w-64" />
      <div className="grid grid-cols-7 gap-1.5 mt-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-20 bg-muted/20 rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-muted/20 rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-48 bg-muted/20 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
