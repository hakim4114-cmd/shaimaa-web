import { ShieldCheck } from "lucide-react";
import { loginAdmin } from "./actions";

export default async function AdminLoginPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const errorCode = resolvedSearchParams?.error;
  const errorMessage =
    errorCode === "locked"
      ? "Too many failed attempts. Please wait 15 minutes before trying again."
      : errorCode === "1"
        ? "The password could not be verified. Please try again."
        : "";

  return (
    <main className="flex min-h-screen items-center justify-center bg-pearl px-4 py-12">
      <section className="w-full max-w-md bg-ivory p-6 shadow-soft sm:p-8">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-cedar text-brass">
            <ShieldCheck size={22} />
          </div>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-henna">Store admin</p>
          <h1 className="mt-2 font-display text-4xl font-bold text-cedar">Maison Shaimaa</h1>
          <p className="mt-3 text-sm leading-6 text-coffee">
            Enter the admin password to access store management.
          </p>
        </div>

        <form action={loginAdmin} className="mt-7 grid gap-4">
          <label className="grid gap-2 text-sm font-semibold text-cedar">
            Password
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              className="w-full border border-brass/30 bg-pearl px-4 py-3 text-cedar outline-none transition focus:border-henna"
            />
          </label>

          {errorMessage ? (
            <p className="bg-henna/10 px-4 py-3 text-sm font-semibold leading-6 text-henna">{errorMessage}</p>
          ) : null}

          <button
            type="submit"
            className="rounded-full bg-henna px-6 py-4 text-sm font-bold uppercase tracking-[0.12em] text-ivory shadow-soft transition hover:bg-cedar"
          >
            Sign in
          </button>
        </form>
      </section>
    </main>
  );
}
