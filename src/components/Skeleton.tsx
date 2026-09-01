/**
 * Placeholder saat data belum siap. Bentuknya sengaja dibuat menyerupai konten
 * asli tiap halaman supaya layout tidak melompat ketika data datang.
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`sk-skeleton ${className}`} />;
}

/** Pembungkus daerah loading — memberi tahu screen reader bahwa isinya sementara. */
export function SkeletonGroup({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div role="status" aria-busy="true" aria-label="Loading" className={className}>
      {children}
    </div>
  );
}
