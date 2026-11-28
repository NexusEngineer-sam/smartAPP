import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import Dashboard from "@/components/dashboard";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.profileCompleted) redirect("/onboarding");
  return <Dashboard user={{ id: user.id, name: user.name, email: user.email, role: user.role, avatarUrl: user.avatarUrl }} />;
}
