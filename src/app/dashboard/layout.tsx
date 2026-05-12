import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { DashboardLayout } from "@/components/dashboard-layout";

export default async function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "EMPLOYER") {
    redirect("/login");
  }

  const employerProfile = await prisma.employerProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      company: {
        include: {
          teamMembers: {
            include: {
              user: {
                select: { id: true, name: true, email: true, avatarUrl: true },
              },
            },
            where: { isActive: true },
          },
        },
      },
    },
  });

  if (!employerProfile || !employerProfile.company) {
    redirect("/login");
  }

  const company = employerProfile.company;

  return (
    <DashboardLayout
      user={{
        name: session.user.name || "Employer",
        email: session.user.email,
        avatarUrl: session.user.image,
        role: employerProfile.role,
      }}
      company={{
        id: company.id,
        name: company.name,
        logo: company.logo,
        slug: company.slug,
        verified: company.verified,
      }}
      teamCount={company.teamMembers.length}
    >
      {children}
    </DashboardLayout>
  );
}
