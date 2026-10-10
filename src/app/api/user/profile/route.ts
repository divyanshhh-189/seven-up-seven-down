import { getCurrentUser } from "@/lib/auth";

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

    return Response.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        balance: user.wallet.balance.toString(),
        createdAt: user.createdAt,
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