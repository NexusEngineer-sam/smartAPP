import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import AdminUsers from "@/components/admin-users";
export default async function AdminPage(){
 const user=await getCurrentUser();if(!user)redirect("/login");if(user.role!=="ADMIN")redirect("/");
 return <main className="admin-page"><header className="admin-header"><Link href="/">← Campus OS</Link><span className="eyebrow">SUPER ADMIN CONTROL CENTER</span></header><div className="admin-intro"><span className="eyebrow">SYSTEM GOVERNANCE</span><h1>Control center</h1><p>Manage access to the campus platform and monitor your user base.</p></div><AdminUsers/></main>;
}
