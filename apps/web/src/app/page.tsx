export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4 max-w-xl px-6">
        <h1 className="text-3xl font-semibold text-primary">Hotel Management</h1>
        <p className="text-muted-foreground">
          Bootstrap đã sẵn sàng. Phase 1 (Auth + Sidebar layout) sẽ thay trang này.
        </p>
        <p className="text-sm text-muted-foreground">
          Xem tiến độ trong <code>PROGRESS.md</code> · Plan đầy đủ trong <code>PLAN.md</code>.
        </p>
      </div>
    </main>
  );
}
