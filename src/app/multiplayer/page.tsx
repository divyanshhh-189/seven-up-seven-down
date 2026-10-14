import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isTableManager } from "@/lib/table-manager";
import MultiplayerClient from "./MultiplayerClient";

export default async function MultiplayerPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <MultiplayerClient isManager={isTableManager(user)} />;
}
