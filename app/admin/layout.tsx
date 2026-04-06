/** Sem bloqueio de login enquanto o app é construído. */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
