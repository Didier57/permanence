import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { getCurrentAccount } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const account = await getCurrentAccount();
  if (!account) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-1">
      <Sidebar
        role={account.role}
        displayName={account.displayName ?? account.email}
      />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
