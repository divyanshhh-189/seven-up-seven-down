import { deleteSession } from "@/lib/auth";

export async function POST() {
  try {
    await deleteSession();

    return Response.json({
      success: true,
      message: "Logged out successfully.",
    });
  } catch (error) {
    console.error("Logout error:", error);

    return Response.json(
      {
        success: false,
        message: "Could not log out.",
      },
      { status: 500 }
    );
  }
}