import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export async function GET() {
  try {
    // Identify the currently logged-in player.
    const user = await getCurrentUser();

    if (!user) {
      return Response.json(
        {
          success: false,
          message: "You must be logged in to view game history.",
        },
        { status: 401 }
      );
    }

    // Retrieve only this player's previous bets.
    const bets = await prisma.bet.findMany({
      where: {
        userId: user.id,
      },
      include: {
        round: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
    });

    // Format the database records for the frontend.
    const history = bets.map((bet) => ({
      id: bet.id,
      dice1: bet.round.dice1,
      dice2: bet.round.dice2,
      total: bet.round.total,
      result: bet.round.result,
      bet: bet.type,
      amount: bet.amount.toString(),
      won: bet.won,
      profit: bet.profit.toString(),
      createdAt: bet.createdAt.toISOString(),
    }));

    return Response.json({
      success: true,
      history,
    });
  } catch (error) {
    console.error("Game history API error:", error);

    return Response.json(
      {
        success: false,
        message: "Could not fetch game history.",
      },
      { status: 500 }
    );
  }
}