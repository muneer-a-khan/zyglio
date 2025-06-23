import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export const metadata: Metadata = {
  title: "SME Dashboard | Zyglio",
  description: "Analytics and insights for Subject Matter Experts",
};

export default async function SMEDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  // Redirect if not authenticated
  if (!session?.user) {
    redirect("/auth/signin?callbackUrl=/sme/dashboard");
  }

  // Note: Role check temporarily disabled for testing
  // if (session.user.role !== "sme") {
  //   redirect("/");
  // }

  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
} 