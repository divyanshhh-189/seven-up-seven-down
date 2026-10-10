import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return Response.json(
        {
          success: false,
          message: "Not authenticated.",
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
        balance: user.wallet?.balance.toString() ?? "0",
      },
    });
  } catch (error) {
    console.error("Auth check error:", error);

    return Response.json(
      {
        success: false,
        message: "Could not check authentication.",
      },
      { status: 500 }
    );
  }
}