import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user || !user.wallet) {
      return Response.json(
        {
          success: false,
          message: "You must be logged in.",
        },
        { status: 401 }
      );
    }

    const avatar = await prisma.userAvatar.findUnique({
      where: { userId: user.id },
      select: { updatedAt: true },
    });

    return Response.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        balance: user.wallet.balance.toString(),
        createdAt: user.createdAt,
        avatarUrl: avatar ? `/api/users/${user.id}/avatar?v=${avatar.updatedAt.getTime()}` : null,
      },
    });
  } catch (error) {
    console.error("Profile API error:", error);

    return Response.json(
      {
        success: false,
        message: "Could not fetch profile.",
      },
      { status: 500 }
    );
  }
}
