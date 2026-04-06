"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LayoutGrid, LogOut, Menu, Users, Waves, CreditCard, ClipboardList, CalendarDays } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/admin", label: "Início", icon: LayoutGrid, exact: true },
  { href: "/admin/alunos", label: "Alunos", icon: Users },
  { href: "/admin/remadas", label: "Remadas", icon: Waves },
  { href: "/admin/turmas", label: "Turmas", icon: CalendarDays },
  { href: "/admin/planos", label: "Planos", icon: ClipboardList },
  { href: "/admin/pagamentos", label: "Pagamentos", icon: CreditCard },
] as const;

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5">
      {nav.map((item) => {
        const { href, label, icon: Icon } = item;
        const exact = "exact" in item && item.exact === true;
        const ativo = exact
          ? pathname === href
          : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Button
            key={href}
            variant={ativo ? "secondary" : "ghost"}
            className={cn(
              "w-full justify-start gap-2",
              ativo && "bg-primary/10 text-foreground"
            )}
            asChild
          >
            <Link href={href} onClick={onNavigate}>
              <Icon className="size-4 opacity-70" />
              {label}
            </Link>
          </Button>
        );
      })}
    </nav>
  );
}

type Props = {
  children: React.ReactNode;
  userEmail: string | null;
};

export function AdminShell({ children, userEmail }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-[calc(100vh-0px)] flex-col md:flex-row">
      <aside className="hidden w-56 shrink-0 border-r border-border bg-card md:flex md:flex-col md:py-4">
        <div className="px-4 pb-3">
          <Link
            href="/admin"
            className="text-sm font-semibold tracking-tight text-foreground"
          >
            Praia da Costa
          </Link>
          <p className="mt-1 truncate text-xs text-muted-foreground">Admin</p>
        </div>
        <Separator className="mb-2" />
        <div className="flex-1 px-2">
          <NavLinks />
        </div>
        <Separator className="my-2" />
        <div className="space-y-2 px-4">
          {userEmail && (
            <p className="truncate text-xs text-muted-foreground" title={userEmail}>
              {userEmail}
            </p>
          )}
          <form action={signOut}>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="w-full gap-2"
            >
              <LogOut className="size-3.5" />
              Sair
            </Button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 md:hidden">
          <span className="font-semibold">Admin</span>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Abrir menu">
                <Menu className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <NavLinks onNavigate={() => setMobileOpen(false)} />
              </div>
              <Separator className="my-4" />
              <form action={signOut}>
                <Button type="submit" variant="outline" className="w-full gap-2">
                  <LogOut className="size-3.5" />
                  Sair
                </Button>
              </form>
            </SheetContent>
          </Sheet>
        </header>

        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
