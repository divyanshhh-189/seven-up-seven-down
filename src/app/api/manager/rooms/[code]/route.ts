import { getCurrentUser } from "@/lib/auth";
import {
  closeRoom,
  getManagerRoomState,
  rollRoom,
  RoomError,
  setRoomBetting,
  setRoomPaused,
  startNextRoomRound,
  startRoom,
  updateRoomSettings,
  removeRoomPlayer,
  resetRoomPlayerBalance,
} from "@/lib/multiplayer";
import { isTableManager } from "@/lib/table-manager";

type RouteContext = { params: Promise<{ code: string }> };

async function getManager() {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, response: Response.json({ success: false, message: "Log in to manage tables." }, { status: 401 }) };
  if (!isTableManager(user)) {
    return { ok: false as const, response: Response.json({ success: false, message: "Manager access is required." }, { status: 403 }) };
  }
  return { ok: true as const, user };
}

export async function GET(_request: Request, { params }: RouteContext) {
  const auth = await getManager();
  if (!auth.ok) return auth.response;
  try {
    const { code } = await params;
    return Response.json(await getManagerRoomState(code, auth.user.id));
  } catch (error) {
    const status = error instanceof RoomError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Could not load manager table.";
    if (status === 500) console.error("Manager room fetch error:", error);
    return Response.json({ success: false, message }, { status });
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const auth = await getManager();
  if (!auth.ok) return auth.response;
  try {
    const [{ code }, body] = await Promise.all([params, request.json()]);
    let result;
    switch (body?.action) {
      case "settings":
        result = await updateRoomSettings(code, auth.user.id, body);
        break;
      case "start":
        result = await startRoom(code, auth.user.id);
        break;
      case "pause":
        result = await setRoomPaused(code, auth.user.id, true);
        break;
      case "resume":
        result = await setRoomPaused(code, auth.user.id, false);
        break;
      case "open-betting":
        result = await setRoomBetting(code, auth.user.id, true);
        break;
      case "close-betting":
        result = await setRoomBetting(code, auth.user.id, false);
        break;
      case "roll":
        result = await rollRoom(code, auth.user.id);
        break;
      case "next":
        result = await startNextRoomRound(code, auth.user.id);
        break;
      case "end":
        result = await closeRoom(code, auth.user.id);
        break;
      case "remove-player":
        result = await removeRoomPlayer(code, auth.user.id, String(body.playerId ?? ""));
        break;
      case "reset-balance":
        result = await resetRoomPlayerBalance(code, auth.user.id, String(body.playerId ?? ""));
        break;
      default:
        return Response.json({ success: false, message: "Unknown manager action." }, { status: 400 });
    }
    return Response.json(result);
  } catch (error) {
    const status = error instanceof RoomError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Could not complete manager action.";
    if (status === 500) console.error("Manager action error:", error);
    return Response.json({ success: false, message }, { status });
  }
}
