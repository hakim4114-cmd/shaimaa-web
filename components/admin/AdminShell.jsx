import { AdminSidebar } from "@/components/layout/AdminSidebar";

export function AdminShell({ children }) {
  return (
    <main className="min-h-screen bg-pearl lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
      <AdminSidebar />
      <section className="min-w-0 p-4 sm:p-6 lg:p-10">
        <div className="mx-auto grid max-w-7xl gap-8">{children}</div>
      </section>
    </main>
  );
}
