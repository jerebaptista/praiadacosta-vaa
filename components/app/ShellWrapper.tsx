"use client";

import { AppSidebar } from "@/components/app/AppSidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

type Props = {
  children: React.ReactNode;
  hasSession: boolean;
  isAdmin: boolean;
  userEmail: string | null;
};

export function ShellWrapper({
  children,
  hasSession,
  isAdmin,
  userEmail,
}: Props) {
  /* Sem login: mostra menu admin para facilitar o build. Com sessão aluno, esconde admin. */
  const menuAdmin = !hasSession || isAdmin;

  return (
    <SidebarProvider>
      <TooltipProvider delayDuration={0}>
        <AppSidebar isAdmin={menuAdmin} userEmail={userEmail} />
        <SidebarInset>
          <header className="flex h-12 shrink-0 items-center gap-2 border-b px-2 md:hidden">
            <SidebarTrigger />
          </header>
          <div className="flex min-h-0 flex-1 flex-col bg-background">
            {children}
          </div>
        </SidebarInset>
      </TooltipProvider>
    </SidebarProvider>
  );
}
