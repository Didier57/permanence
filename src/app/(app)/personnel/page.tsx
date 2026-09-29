import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { getCurrentAccount } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PersonnelManager, type GroupOption, type UserView } from "./personnel-manager";

export const metadata = { title: "Personnel - Permanence" };

export default async function PersonnelPage({ searchParams }: PageProps<"/personnel">) {
  const account = await getCurrentAccount();
  if (!account || account.role !== "ADMIN") {
    redirect("/planning");
  }

  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const groupId = typeof params.groupId === "string" ? params.groupId : "";

  const [users, groups] = await Promise.all([
    prisma.user.findMany({
      where: {
        AND: [
          q
            ? {
                OR: [
                  { firstName: { contains: q, mode: "insensitive" } },
                  { lastName: { contains: q, mode: "insensitive" } },
                  { email: { contains: q, mode: "insensitive" } },
                  { proPhone: { contains: q } },
                  { privatePhone: { contains: q } },
                ],
              }
            : {},
          groupId ? { memberships: { some: { groupId } } } : {},
        ],
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      include: {
        memberships: { include: { group: true } },
        _count: { select: { permanences: true } },
      },
    }),
    prisma.group.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const userViews: UserView[] = users.map((user) => ({
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    proPhone: user.proPhone,
    privatePhone: user.privatePhone,
    active: user.active,
    groupIds: user.memberships.map((membership) => membership.groupId),
    groups: user.memberships
      .map((membership) => ({ id: membership.groupId, name: membership.group.name }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    permanenceCount: user._count.permanences,
  }));

  const groupOptions: GroupOption[] = groups;

  return (
    <>
      <PageHeader title="Personnel" description="Personnes et affectation aux groupes" />
      <main className="flex-1 p-6">
        <PersonnelManager users={userViews} groups={groupOptions} query={q} groupId={groupId} />
      </main>
    </>
  );
}
