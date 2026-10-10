import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return Response.json(
        {
          success: false,
          message: "You must be logged in to view analytics.",
        },
        { status: 401 }
      );
    }

    const bets = await prisma.bet.findMany({
      where: {
        userId: user.id,
      },
      include: {
        round: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const analytics = bets.map((bet) => ({
      id: bet.id,
      dice1: bet.round.dice1,
      dice2: bet.round.dice2,
      total: bet.round.total,
      result: bet.round.result,
      bet: bet.type,
      amount: Number(bet.amount),
      won: bet.won,
      profit: Number(bet.profit),
      createdAt: bet.createdAt.toISOString(),
    }));

    return Response.json({
      success: true,
      totalRecords: analytics.length,
      analytics,
    });
  } catch (error) {
    console.error("Game analytics API error:", error);

    return Response.json(
      {
        success: false,
        message: "Could not fetch game analytics.",
      },
      { status: 500 }
    );
  }
}