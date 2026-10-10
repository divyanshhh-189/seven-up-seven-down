import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

import GamePageClient from "./GamePageClient";

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return <GamePageClient />;
}