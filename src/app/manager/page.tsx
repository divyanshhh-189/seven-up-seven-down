import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isTableManager } from "@/lib/table-manager";
import ManagerClient from "./ManagerClient";

export default async function ManagerPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isTableManager(user)) notFound();
  return <ManagerClient />;
}
