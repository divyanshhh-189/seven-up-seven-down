import { getCurrentUser } from "@/lib/auth";
import { createRoom, listManagerRooms, RoomError } from "@/lib/multiplayer";
import { isTableManager } from "@/lib/table-manager";

async function getManager() {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, response: Response.json({ success: false, message: "Log in to manage tables." }, { status: 401 }) };
  if (!isTableManager(user)) {
    return { ok: false as const, response: Response.json({ success: false, message: "Manager access is required." }, { status: 403 }) };
  }
  return { ok: true as const, user };
}

export async function GET() {
  const auth = await getManager();
  if (!auth.ok) return auth.response;
  try {
    return Response.json(await listManagerRooms(auth.user.id));
  } catch (error) {
    console.error("Manager room list error:", error);
    return Response.json({ success: false, message: "Could not load your tables." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await getManager();
  if (!auth.ok) return auth.response;
  try {
    const code = await createRoom(auth.user.id, await request.json());
    return Response.json({ success: true, code }, { status: 201 });
  } catch (error) {
    const status = error instanceof RoomError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Could not create a table.";
    if (status === 500) console.error("Manager room creation error:", error);
    return Response.json({ success: false, message }, { status });
  }
}
