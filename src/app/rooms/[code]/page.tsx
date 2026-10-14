import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import RoomClient from "@/app/rooms/[code]/RoomClient";

export default async function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const [{ code }, user] = await Promise.all([params, getCurrentUser()]);
  if (!user) redirect("/login");
  return <RoomClient code={code.toUpperCase()} userId={user.id} />;
}
