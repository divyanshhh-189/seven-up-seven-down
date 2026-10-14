import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const viewer = await getCurrentUser();
  if (!viewer) return new Response("Unauthorized", { status: 401 });

  const { userId } = await params;
  const avatar = await prisma.userAvatar.findUnique({ where: { userId } });
  if (!avatar) return new Response("Not found", { status: 404 });

  return new Response(avatar.data, {
    headers: {
      "Content-Type": avatar.mimeType,
      "Cache-Control": "private, max-age=60",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
