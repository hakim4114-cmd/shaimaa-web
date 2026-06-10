import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-pearl px-4 py-12">
      <section className="w-full max-w-md bg-ivory p-8 text-center shadow-soft">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-henna">404</p>
        <h1 className="mt-3 font-display text-4xl font-bold text-cedar">Maison Shaimaa</h1>
        <p className="mt-4 text-sm leading-6 text-coffee" dir="rtl" lang="ar">
          هذه الصفحة غير موجودة. يمكنك العودة إلى الصفحة الرئيسية أو تصفح المجموعة.
        </p>
        <p className="mt-2 text-sm leading-6 text-coffee">
          This page could not be found. You can return home or browse the collection.
        </p>
        <div className="mt-7 grid gap-3">
          <Link
            href="/"
            className="rounded-full bg-henna px-6 py-3 text-sm font-bold uppercase tracking-[0.12em] text-ivory shadow-soft transition hover:bg-cedar"
          >
            Home / الرئيسية
          </Link>
          <Link
            href="/products"
            className="rounded-full border border-brass/40 px-6 py-3 text-sm font-bold uppercase tracking-[0.12em] text-cedar transition hover:border-henna hover:text-henna"
          >
            Collection / المجموعة
          </Link>
        </div>
      </section>
    </main>
  );
}
