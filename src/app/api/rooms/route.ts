import { getCurrentUser } from "@/lib/auth";
import { closeRoom, createRoom, rollRoom, RoomError, startNextRoomRound, startRoom } from "@/lib/multiplayer";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ success: false, message: "Log in to use multiplayer." }, { status: 401 });
  }
  try {
    const input = await request.json();
    if (typeof input?.action === "string") {
      let result;
      switch (input.action) {
        case "start": result = await startRoom(String(input.code ?? ""), user.id); break;
        case "roll": result = await rollRoom(String(input.code ?? ""), user.id); break;
        case "next": result = await startNextRoomRound(String(input.code ?? ""), user.id); break;
        case "end": result = await closeRoom(String(input.code ?? ""), user.id); break;
        default: return Response.json({ success: false, message: "Unknown room action." }, { status: 400 });
      }
      return Response.json(result);
    }
    const code = await createRoom(user.id, input);
    return Response.json({ success: true, code }, { status: 201 });
  } catch (error) {
    const status = error instanceof RoomError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Could not create a room.";
    if (status === 500) console.error("Room creation error:", error);
    return Response.json({ success: false, message }, { status });
  }
}
