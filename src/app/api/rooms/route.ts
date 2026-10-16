import { getCurrentUser } from "@/lib/auth";
import { createRoom, RoomError } from "@/lib/multiplayer";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ success: false, message: "Log in to use multiplayer." }, { status: 401 });
  }
  try {
    const input = await request.json();
    const code = await createRoom(user.id, input);
    return Response.json({ success: true, code }, { status: 201 });
  } catch (error) {
    const status = error instanceof RoomError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Could not create a room.";
    if (status === 500) console.error("Room creation error:", error);
    return Response.json({ success: false, message }, { status });
  }
}
