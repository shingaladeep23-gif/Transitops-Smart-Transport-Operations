import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { logout } from "@/lib/actions/auth";
import { ROLE_LABELS } from "@/lib/format";
import NavLinks from "@/components/NavLinks";
import ThemeToggle from "@/components/ThemeToggle";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();

  return (
    <div className="flex min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 md:flex">
        <Link href="/" className="mb-6 px-2 text-xl font-bold tracking-tight">
          Transit<span className="text-blue-600">Ops</span>
        </Link>
        <NavLinks />
        <div className="mt-auto border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <div className="mb-3 px-2">
            <ThemeToggle />
          </div>
          <div className="px-2 text-sm font-medium">{session.name}</div>
          <div className="px-2 text-xs text-zinc-500">{ROLE_LABELS[session.role]}</div>
          <form action={logout} className="mt-3 px-2">
            <button className="text-xs font-medium text-red-600 hover:underline dark:text-red-400">Sign out</button>
          </form>
        </div>
      </aside>

      <div className="flex w-full flex-col md:pl-60">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-200 bg-white/80 px-4 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80 md:hidden">
          <Link href="/" className="text-lg font-bold">
            Transit<span className="text-blue-600">Ops</span>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <form action={logout}>
              <button className="text-xs font-medium text-red-600 dark:text-red-400">Sign out</button>
            </form>
          </div>
        </header>
        <div className="border-b border-zinc-200 bg-white px-4 py-2 dark:border-zinc-800 dark:bg-zinc-900 md:hidden">
          <NavLinks horizontal />
        </div>
        <main className="mx-auto w-full max-w-7xl flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
