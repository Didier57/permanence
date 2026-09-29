import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { getCurrentAccount } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { GroupManager, type GroupView, type UserOption } from "./group-manager";

export const metadata = { title: "Groupes - Permanence" };

export default async function GroupsPage() {
  const account = await getCurrentAccount();
  if (!account || account.role !== "ADMIN") {
    redirect("/planning");
  }

  const [groups, users] = await Promise.all([
    prisma.group.findMany({
      orderBy: { name: "asc" },
      include: {
        members: { include: { user: true } },
        _count: { select: { permanences: true } },
      },
    }),
    prisma.user.findMany({
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true, email: true, active: true },
    }),
  ]);

  const groupViews: GroupView[] = groups.map((group) => ({
    id: group.id,
    name: group.name,
    description: group.description,
    color: group.color,
    permanenceCount: group._count.permanences,
    memberIds: group.members.map((member) => member.userId),
    members: group.members
      .map((member) => ({
        id: member.user.id,
        label: `${member.user.firstName} ${member.user.lastName}`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  }));

  const userOptions: UserOption[] = users.map((user) => ({
    id: user.id,
    label: `${user.lastName} ${user.firstName}`,
    email: user.email,
    active: user.active,
  }));

  return (
    <>
      <PageHeader
        title="Groupes"
        description="Un groupe regroupe des personnes. Un membre peut appartenir a plusieurs groupes."
      />
      <main className="flex-1 p-6">
        <GroupManager groups={groupViews} users={userOptions} />
      </main>
    </>
  );
}
