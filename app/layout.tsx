import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ShellWrapper } from "@/components/app/ShellWrapper";
import { createClient } from "@/lib/supabase/server";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Praia da Costa Vaa",
  description: "Resumo, remadas e gestão do estúdio",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let hasSession = false;
  let isAdmin = false;
  let userEmail: string | null = null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      hasSession = true;
      userEmail = user.email ?? null;
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      isAdmin = profile?.role === "admin";
    }
  } catch {
    /* sem .env ou cliente indisponível */
  }

  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground antialiased">
        <ShellWrapper
          hasSession={hasSession}
          isAdmin={isAdmin}
          userEmail={userEmail}
        >
          {children}
        </ShellWrapper>
      </body>
    </html>
  );
}
