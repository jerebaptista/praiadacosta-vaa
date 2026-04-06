"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/alunos", label: "Alunos" },
  { href: "/pagamentos", label: "Pagamentos" },
] as const;

export function AppNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/90 shadow-sm backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-6 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="group flex items-center gap-2 font-semibold tracking-tight text-zinc-900"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-sm text-white shadow-sm transition group-hover:bg-teal-700">
            P
          </span>
          <span className="hidden sm:inline">Praia da Costa</span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Principal">
          {links.map(({ href, label }) => {
            const ativo =
              pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  ativo
                    ? "bg-teal-50 text-teal-900 ring-1 ring-teal-200/80"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
