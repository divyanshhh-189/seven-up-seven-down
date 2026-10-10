import { randomInt } from "crypto";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

type BetType = "UP" | "SEVEN" | "DOWN";

function getResult(total: number): BetType {
  if (total === 7) {
    return "SEVEN";
  }

  if (total > 7) {
    return "UP";
  }

  return "DOWN";
}

function getPayoutMultiplier(bet: BetType): number {
  if (bet === "SEVEN") {
    return 5;
  }

  return 1;
}

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
      balance: user.wallet.balance.toString(),
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Balance API error:", error);

    return Response.json(
      {
        success: false,
        message: "Could not fetch balance.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { betType, amount } = body;

    const user = await getCurrentUser();

if (!user || !user.wallet) {
  return Response.json(
    {
      success: false,
      message: "You must be logged in to play.",
    },
    { status: 401 }
  );
}
    
    if (!["UP", "SEVEN", "DOWN"].includes(betType)) {
      return Response.json(
        {
          success: false,
          message: "Invalid bet type.",
        },
        { status: 400 }
      );
    }

    if (
      typeof amount !== "number" ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return Response.json(
        {
          success: false,
          message: "Invalid bet amount.",
        },
        { status: 400 }
      );
    }

    if (!Number.isInteger(amount)) {
      return Response.json(
        {
          success: false,
          message: "Bet amount must be a whole number.",
        },
        { status: 400 }
      );
    }

    // Find the player and wallet.

    

    const balanceBefore = Number(user.wallet.balance);

    if (amount > balanceBefore) {
      return Response.json(
        {
          success: false,
          message: "Insufficient virtual balance.",
        },
        { status: 400 }
      );
    }

    // Secure server-side dice generation.
    const dice1 = randomInt(1, 7);
    const dice2 = randomInt(1, 7);

    const total = dice1 + dice2;
    const result = getResult(total);

    const won = betType === result;

    const multiplier = getPayoutMultiplier(betType);

    const profit = won ? amount * multiplier : 0;

    const balanceAfterBet = balanceBefore - amount;
    const finalBalance = balanceAfterBet + (won ? amount + profit : 0);

    // Save everything atomically.
    const gameData = await prisma.$transaction(
      async (tx) => {
        const walletUpdate = await tx.wallet.updateMany({
          where: {
            id: user.wallet!.id,
            balance: {
              gte: amount,
            },
          },
          data: {
            balance: {
              decrement: amount,
            },
          },
        });

        if (walletUpdate.count !== 1) {
          throw new Error("Balance changed. Please try again.");
        }

        const round = await tx.gameRound.create({
          data: {
            dice1,
            dice2,
            total,
            result,
          },
        });

        await tx.bet.create({
          data: {
            userId: user.id,
            roundId: round.id,
            type: betType,
            amount,
            won,
            profit: won ? profit : -amount,
          },
        });

        await tx.transaction.create({
          data: {
            userId: user.id,
            type: "BET",
            amount: -amount,
            balanceBefore,
            balanceAfter: balanceAfterBet,
            description: `Bet placed on ${betType}`,
          },
        });

        let updatedBalance = balanceAfterBet;

        if (won) {
          await tx.wallet.update({
            where: {
              id: user.wallet!.id,
            },
            data: {
              balance: {
                increment: amount + profit,
              },
            },
          });

          await tx.transaction.create({
            data: {
              userId: user.id,
              type: "WIN",
              amount: amount + profit,
              balanceBefore: balanceAfterBet,
              balanceAfter: finalBalance,
              description: `Won on ${betType}`,
            },
          });

          updatedBalance = finalBalance;
        }

        return {
          round,
          balance: updatedBalance,
        };
      },
      {
        isolationLevel: "Serializable",
      }
    );

    return Response.json({
      success: true,

      round: {
        id: gameData.round.id,
        dice1,
        dice2,
        total,
        result,
      },

      bet: {
        type: betType,
        amount,
        won,
        profit: won ? profit : -amount,
      },

      balance: gameData.balance,
    });
  } catch (error) {
    console.error("Game API error:", error);

    return Response.json(
      {
        success: false,
        message: "Game could not be completed.",
      },
      { status: 500 }
    );
  }
}