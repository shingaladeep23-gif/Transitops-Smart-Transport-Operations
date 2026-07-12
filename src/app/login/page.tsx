import ActionForm from "@/components/ActionForm";
import { login } from "@/lib/actions/auth";
import { inputCls, btnPrimary } from "@/components/ui";

export const metadata = { title: "Login — TransitOps" };

const DEMO_ACCOUNTS = [
  ["manager@transitops.com", "Fleet Manager"],
  ["driver@transitops.com", "Dispatcher / Driver"],
  ["safety@transitops.com", "Safety Officer"],
  ["finance@transitops.com", "Financial Analyst"],
];

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-4 dark:bg-zinc-950">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="text-3xl font-bold tracking-tight">
            Transit<span className="text-blue-600">Ops</span>
          </div>
          <p className="mt-1 text-sm text-zinc-500">Smart Transport Operations Platform</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <ActionForm action={login}>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input name="email" type="email" required className={inputCls} placeholder="you@company.com" />
            <label className="mb-1 mt-4 block text-sm font-medium">Password</label>
            <input name="password" type="password" required className={inputCls} placeholder="••••••••" />
            <button type="submit" className={`${btnPrimary} mt-5 w-full`}>
              Sign in
            </button>
          </ActionForm>
        </div>
        <div className="mt-6 rounded-xl border border-dashed border-zinc-300 p-4 text-xs text-zinc-500 dark:border-zinc-700">
          <div className="mb-2 font-semibold">Demo accounts (password: password123)</div>
          <ul className="space-y-1">
            {DEMO_ACCOUNTS.map(([email, role]) => (
              <li key={email} className="flex justify-between">
                <span className="font-mono">{email}</span>
                <span>{role}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
