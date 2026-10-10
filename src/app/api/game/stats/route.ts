import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Get the currently authenticated user.
    const user = await getCurrentUser();

    if (!user) {
      return Response.json(
        {
          success: false,
          message: "You must be logged in to view statistics.",
        },
        { status: 401 }
      );
    }

    // Calculate statistics from this user's recorded bets.
    const [totalBets, totalWins, totalLosses, profitResult] =
      await Promise.all([
        prisma.bet.count({
          where: { userId: user.id },
        }),

        prisma.bet.count({
          where: {
            userId: user.id,
            won: true,
          },
        }),

        prisma.bet.count({
          where: {
            userId: user.id,
            won: false,
          },
        }),

        prisma.bet.aggregate({
          where: { userId: user.id },
          _sum: {
            profit: true,
          },
        }),
      ]);

    const netProfitLoss = Number(
      profitResult._sum.profit ?? 0
    );

    const winRate =
      totalBets > 0
        ? Number(((totalWins / totalBets) * 100).toFixed(2))
        : 0;

    return Response.json({
      success: true,
      stats: {
        totalBets,
        totalWins,
        totalLosses,
        winRate,
        netProfitLoss,
        balance: user.wallet?.balance.toString() ?? "0",
      },
    });
  } catch (error) {
    console.error("Game statistics API error:", error);

    return Response.json(
      {
        success: false,
        message: "Could not fetch game statistics.",
      },
      { status: 500 }
    );
  }
}