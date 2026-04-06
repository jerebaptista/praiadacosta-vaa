"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  UserCircle,
  Users,
  Waves,
  ClipboardList,
  CalendarDays,
  Settings,
  LogOut,
} from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";

const principal = [
  { href: "/", label: "Resumo", icon: LayoutDashboard, exact: true },
  { href: "/remadas", label: "Remadas", icon: Waves },
  { href: "/conta", label: "Conta", icon: UserCircle },
] as const;

const admin = [
  { href: "/", label: "Resumo", icon: LayoutDashboard, exact: true },
  { href: "/admin/remadas", label: "Remadas", icon: Waves },
  { href: "/admin/turmas", label: "Turmas", icon: CalendarDays },
  { href: "/alunos", label: "Alunos", icon: Users },
  { href: "/admin/planos", label: "Planos", icon: ClipboardList },
  { href: "/admin/configuracoes", label: "Configurações", icon: Settings },
] as const;

type Props = {
  isAdmin: boolean;
  userEmail: string | null;
};

export function AppSidebar({ isAdmin, userEmail }: Props) {
  const pathname = usePathname();

  function ativo(href: string, exact?: boolean): boolean {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip="Praia da Costa Vaa">
              <Link
                href="/"
                className="flex min-w-0 items-center gap-2 overflow-hidden"
              >
                <Avatar className="size-6 shrink-0 rounded-full">
                  <AvatarImage
                    src="/brand-logo.png"
                    alt="Praia da Costa Vaa"
                  />
                  <AvatarFallback className="rounded-full bg-primary/15 text-[10px] font-semibold text-primary">
                    PV
                  </AvatarFallback>
                </Avatar>
                <span className="truncate font-semibold">
                  Praia da Costa Vaa
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {principal.map((item) => {
                const { href, label, icon: Icon } = item;
                const exact = "exact" in item && item.exact === true;
                return (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton
                      asChild
                      isActive={ativo(href, exact)}
                      tooltip={label}
                    >
                      <Link href={href}>
                        <Icon />
                        <span>{label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {isAdmin && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>Admin</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {admin.map((item) => {
                    const { href, label, icon: Icon } = item;
                    const exact = "exact" in item && item.exact === true;
                    return (
                      <SidebarMenuItem key={`admin-${href}-${label}`}>
                        <SidebarMenuButton
                          asChild
                          isActive={ativo(href, exact)}
                          tooltip={label}
                        >
                          <Link href={href}>
                            <Icon />
                            <span>{label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>
      <SidebarFooter>
        {userEmail ? (
          <p className="truncate px-2 text-xs text-sidebar-foreground/70">
            {userEmail}
          </p>
        ) : null}
        <SidebarMenu>
          <SidebarMenuItem>
            <form action={signOut} className="w-full">
              <SidebarMenuButton type="submit" variant="outline" tooltip="Sair">
                <LogOut />
                <span>Sair</span>
              </SidebarMenuButton>
            </form>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
