import { getCurrentUser } from "@/lib/auth";
import { getRoomState, joinRoom, placeRoomBet, RoomError } from "@/lib/multiplayer";

type RouteContext = { params: Promise<{ code: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ success: false, message: "Log in to open a room." }, { status: 401 });

  try {
    const { code } = await params;
    return Response.json(await getRoomState(code, user.id));
  } catch (error) {
    const status = error instanceof RoomError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Could not load this room.";
    if (status === 500) console.error("Room fetch error:", error);
    return Response.json({ success: false, message }, { status });
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ success: false, message: "Log in to use multiplayer." }, { status: 401 });

  try {
    const [{ code }, body] = await Promise.all([params, request.json()]);
    let result;
    switch (body?.action) {
      case "join":
        result = await joinRoom(code, user.id);
        break;
      case "bet":
        result = await placeRoomBet(code, user.id, body);
        break;
      default:
        return Response.json(
          { success: false, message: "Table manager controls are available only in the manager area." },
          { status: 403 },
        );
    }
    return Response.json(result);
  } catch (error) {
    const status = error instanceof RoomError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Could not complete this room action.";
    if (status === 500) console.error("Room action error:", error);
    return Response.json({ success: false, message }, { status });
  }
}
