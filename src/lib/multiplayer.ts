import { randomInt } from "crypto";
import { prisma } from "@/lib/prisma";

export type RoomBetType = "UP" | "SEVEN" | "DOWN";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export class RoomError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function makeCode() {
  return Array.from({ length: 6 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
}

function getResult(total: number): RoomBetType {
  if (total === 7) return "SEVEN";
  return total > 7 ? "UP" : "DOWN";
}

function payoutMultiplier(type: RoomBetType) {
  return type === "SEVEN" ? 5 : 1;
}

function validRoomSettings(input: {
  name?: unknown;
  maxPlayers?: unknown;
  roundSeconds?: unknown;
  minBet?: unknown;
  maxBet?: unknown;
}) {
  const name = typeof input.name === "string" ? input.name.trim() : "Lucky Table";
  const maxPlayers = Number(input.maxPlayers ?? 6);
  const roundSeconds = Number(input.roundSeconds ?? 30);
  const minBet = Number(input.minBet ?? 1);
  const maxBet = Number(input.maxBet ?? 10_000);

  if (!name || name.length > 40) throw new RoomError("Room name must be 1–40 characters.");
  if (!Number.isInteger(maxPlayers) || maxPlayers < 2 || maxPlayers > 12) throw new RoomError("Choose a room size from 2 to 12 players.");
  if (!Number.isInteger(roundSeconds) || roundSeconds < 10 || roundSeconds > 120) throw new RoomError("Round time must be between 10 and 120 seconds.");
  if (!Number.isSafeInteger(minBet) || minBet < 1 || minBet > 9_999_999_999) throw new RoomError("The minimum bet must be a positive whole number.");
  if (!Number.isSafeInteger(maxBet) || maxBet < minBet || maxBet > 9_999_999_999) throw new RoomError("The maximum bet must be at least the minimum bet.");

  return { name, maxPlayers, roundSeconds, minBet, maxBet };
}

export async function createRoom(userId: string, input: Record<string, unknown>) {
  const settings = validRoomSettings(input);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const code = makeCode();
    const existing = await prisma.gameRoom.findUnique({ where: { code }, select: { id: true } });
    if (existing) continue;

    await prisma.$transaction(async (tx) => {
      const room = await tx.gameRoom.create({
        data: { ...settings, code, hostUserId: userId, status: "WAITING", bettingOpen: false },
      });
      await tx.roomPlayer.create({ data: { roomId: room.id, userId } });
    });

    return code;
  }

  throw new RoomError("Could not create a room code. Please try again.", 503);
}

export async function getRoomState(code: string, userId: string) {
  const room = await prisma.gameRoom.findUnique({
    where: { code: code.toUpperCase() },
    include: {
      players: {
        where: { removedAt: null },
        orderBy: { joinedAt: "asc" },
        select: {
          userId: true,
          joinedAt: true,
          user: { select: { username: true, avatar: { select: { updatedAt: true } } } },
        },
      },
      rounds: {
        orderBy: { number: "desc" },
        take: 1,
        include: {
          bets: {
            orderBy: { createdAt: "asc" },
            include: { user: { select: { username: true } } },
          },
        },
      },
    },
  });

  if (!room) throw new RoomError("No room found with that code.", 404);
  if (!room.players.some((player) => player.userId === userId)) {
    throw new RoomError("Join this room to see the lobby.", 403);
  }

  const wallet = await prisma.wallet.findUnique({ where: { userId }, select: { balance: true } });
  const round = room.rounds[0];

  return {
    success: true,
    userId,
    balance: wallet?.balance.toString() ?? "0",
    room: {
      code: room.code,
      isHost: room.hostUserId === userId,
      name: room.name,
      status: room.status,
      bettingOpen: room.bettingOpen,
      players: room.players.map((player) => ({
        userId: player.userId,
        username: player.user.username,
        joinedAt: player.joinedAt,
        avatarUrl: player.user.avatar
          ? `/api/users/${player.userId}/avatar?v=${player.user.avatar.updatedAt.getTime()}`
          : null,
      })),
      currentRound: round
        ? {
            id: round.id,
            number: round.number,
            status: round.status,
            endsAt: round.endsAt,
            dice1: round.dice1,
            dice2: round.dice2,
            total: round.total,
            result: round.result,
            bets: round.bets.map((bet) => ({
              userId: bet.userId,
              username: bet.user.username,
              type: bet.type,
              amount: bet.amount.toString(),
              won: bet.won,
              profit: bet.profit?.toString() ?? null,
              cancelled: bet.cancelled,
            })),
          }
        : null,
    },
  };
}

export async function getRoomHistory(code: string, userId: string) {
  const room = await prisma.gameRoom.findUnique({
    where: { code: code.toUpperCase() },
    select: {
      players: {
        where: { userId, removedAt: null },
        select: { userId: true },
      },
      rounds: {
        orderBy: { number: "desc" },
        take: 10,
        include: {
          bets: {
            orderBy: { createdAt: "asc" },
            include: { user: { select: { username: true } } },
          },
        },
      },
    },
  });

  if (!room) throw new RoomError("No room found with that code.", 404);
  if (room.players.length === 0) throw new RoomError("Join this room to see its results.", 403);

  return {
    success: true,
    roundHistory: room.rounds.map((round) => ({
      id: round.id,
      number: round.number,
      status: round.status,
      dice1: round.dice1,
      dice2: round.dice2,
      total: round.total,
      result: round.result,
      bets: round.bets.map((bet) => ({
        userId: bet.userId,
        username: bet.user.username,
        type: bet.type,
        amount: bet.amount.toString(),
        won: bet.won,
        profit: bet.profit?.toString() ?? null,
        cancelled: bet.cancelled,
      })),
    })),
  };
}

export async function joinRoom(code: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const room = await tx.gameRoom.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        _count: { select: { players: { where: { removedAt: null } } } },
        players: { where: { userId }, select: { id: true, removedAt: true } },
      },
    });
    if (!room) throw new RoomError("No room found with that code.", 404);
    if (room.status === "CLOSED") throw new RoomError("This room is closed.", 410);
    if (room.players[0]?.removedAt) throw new RoomError("The table manager removed you from this room.", 403);
    if (room.players.length === 0) {
      if (room._count.players >= room.maxPlayers) throw new RoomError("This room is full.", 409);
      await tx.roomPlayer.create({ data: { roomId: room.id, userId } });
    }
    return { success: true, code: room.code };
  }, { isolationLevel: "Serializable" });
}

export async function updateRoomSettings(
  code: string,
  userId: string,
  input: Record<string, unknown>,
) {
  return prisma.$transaction(async (tx) => {
    const room = await tx.gameRoom.findUnique({
      where: { code: code.toUpperCase() },
      include: { _count: { select: { players: { where: { removedAt: null } } } } },
    });
    if (!room) throw new RoomError("No room found with that code.", 404);
    if (room.hostUserId !== userId) throw new RoomError("You can only manage your own tables.", 403);
    if (room.status === "CLOSED") throw new RoomError("This room is closed.", 410);

    const settings = validRoomSettings(input);
    if (settings.maxPlayers < room._count.players) {
      throw new RoomError("Room capacity cannot be lower than the number of players already inside.");
    }

    await tx.gameRoom.update({ where: { id: room.id }, data: settings });
    const round = await tx.roomRound.findFirst({
      where: { roomId: room.id },
      orderBy: { number: "desc" },
    });
    if (round?.status === "BETTING" && room.status === "OPEN" && room.bettingOpen) {
      await tx.roomRound.update({
        where: { id: round.id },
        data: { endsAt: new Date(Date.now() + settings.roundSeconds * 1000) },
      });
    }

    return { success: true };
  }, { isolationLevel: "Serializable" });
}

export async function placeRoomBet(
  code: string,
  userId: string,
  input: { betType?: unknown; amount?: unknown },
) {
  const betType = input.betType;
  const amount = input.amount;
  if (typeof betType !== "string" || !["UP", "SEVEN", "DOWN"].includes(betType)) {
    throw new RoomError("Choose a valid prediction.");
  }
  if (typeof amount !== "number" || !Number.isSafeInteger(amount) || amount <= 0 || amount > 9_999_999_999) {
    throw new RoomError("Enter a positive whole number for your bet.");
  }

  return prisma.$transaction(async (tx) => {
    const room = await tx.gameRoom.findUnique({
      where: { code: code.toUpperCase() },
      include: { players: { where: { userId, removedAt: null }, select: { id: true } } },
    });
    if (!room) throw new RoomError("No room found with that code.", 404);
    if (room.players.length === 0) throw new RoomError("Join the room before betting.", 403);
    if (room.status === "PAUSED") throw new RoomError("The table manager paused this table.", 409);
    if (room.status !== "OPEN") throw new RoomError("The table is not running.", 410);
    if (!room.bettingOpen) throw new RoomError("The table manager closed betting for this round.", 409);
    if (amount < room.minBet || amount > room.maxBet) {
      throw new RoomError("Your bet is outside the table's current limits.", 400);
    }

    const round = await tx.roomRound.findFirst({
      where: { roomId: room.id },
      orderBy: { number: "desc" },
    });
    if (!round || round.status !== "BETTING" || round.endsAt <= new Date()) {
      throw new RoomError("Betting is closed for this round.", 409);
    }
    const existingBet = await tx.roomBet.findUnique({
      where: { roundId_userId: { roundId: round.id, userId } },
      select: { id: true },
    });
    if (existingBet) throw new RoomError("You already placed a bet this round.", 409);

    const wallet = await tx.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new RoomError("Your wallet is unavailable.", 404);
    const balanceBefore = Number(wallet.balance);
    const updated = await tx.wallet.updateMany({
      where: { id: wallet.id, balance: { gte: amount } },
      data: { balance: { decrement: amount } },
    });
    if (updated.count !== 1) throw new RoomError("Insufficient virtual balance.", 400);

    await tx.roomBet.create({
      data: { roundId: round.id, userId, type: betType as RoomBetType, amount },
    });
    await tx.transaction.create({
      data: {
        userId,
        type: "BET",
        amount: -amount,
        balanceBefore,
        balanceAfter: balanceBefore - amount,
        description: `Multiplayer bet on ${betType}`,
      },
    });
    return { success: true };
  }, { isolationLevel: "Serializable" });
}

export async function rollRoom(code: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const room = await tx.gameRoom.findUnique({ where: { code: code.toUpperCase() } });
    if (!room) throw new RoomError("No room found with that code.", 404);
    if (room.hostUserId !== userId) throw new RoomError("You can only manage your own tables.", 403);
    if (room.status !== "OPEN") throw new RoomError("Resume the table before rolling.", 409);
    const membership = await tx.roomPlayer.findUnique({
      where: { roomId_userId: { roomId: room.id, userId } },
      select: { id: true, removedAt: true },
    });
    if (!membership || membership.removedAt) throw new RoomError("Manager access is required to roll.", 403);

    const round = await tx.roomRound.findFirst({
      where: { roomId: room.id },
      orderBy: { number: "desc" },
    });
    if (!round) throw new RoomError("There is no active round.", 409);
    if (round.status === "ROLLED") {
      return { success: true, dice1: round.dice1, dice2: round.dice2, total: round.total, result: round.result };
    }
    if (round.status !== "BETTING") throw new RoomError("This round is no longer active.", 409);


    const dice1 = randomInt(1, 7);
    const dice2 = randomInt(1, 7);
    const total = dice1 + dice2;
    const result = getResult(total);
    await tx.gameRoom.update({ where: { id: room.id }, data: { bettingOpen: false } });
    const updatedRound = await tx.roomRound.updateMany({
      where: { id: round.id, status: "BETTING" },
      data: { dice1, dice2, total, result, status: "ROLLED", settledAt: new Date() },
    });
    if (updatedRound.count !== 1) {
      const settledRound = await tx.roomRound.findUnique({ where: { id: round.id } });
      if (settledRound?.status === "ROLLED") {
        return {
          success: true,
          dice1: settledRound.dice1,
          dice2: settledRound.dice2,
          total: settledRound.total,
          result: settledRound.result,
        };
      }
      throw new RoomError("This round is no longer available.", 409);
    }

    const bets = await tx.roomBet.findMany({ where: { roundId: round.id, settledAt: null } });
    for (const bet of bets) {
      const won = bet.type === result;
      const stake = Number(bet.amount);
      const profit = won ? stake * payoutMultiplier(bet.type) : -stake;
      if (won) {
        const wallet = await tx.wallet.findUnique({ where: { userId: bet.userId } });
        if (!wallet) throw new RoomError("A player wallet is unavailable.", 500);
        const balanceBefore = Number(wallet.balance);
        const payout = stake + profit;
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: { increment: payout } },
        });
        await tx.transaction.create({
          data: {
            userId: bet.userId,
            type: "WIN",
            amount: payout,
            balanceBefore,
            balanceAfter: balanceBefore + payout,
            description: `Multiplayer win on ${bet.type}`,
          },
        });
      }
      await tx.roomBet.update({
        where: { id: bet.id },
        data: { won, profit, settledAt: new Date() },
      });
    }

    return { success: true, dice1, dice2, total, result };
  });
}

export async function startNextRoomRound(code: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const room = await tx.gameRoom.findUnique({ where: { code: code.toUpperCase() } });
    if (!room) throw new RoomError("No room found with that code.", 404);
    if (room.hostUserId !== userId) throw new RoomError("You can only manage your own tables.", 403);
    if (room.status !== "OPEN") throw new RoomError("This room is closed.", 410);

    const previous = await tx.roomRound.findFirst({
      where: { roomId: room.id },
      orderBy: { number: "desc" },
    });
    if (!previous || previous.status !== "ROLLED") {
      throw new RoomError("Roll the current round before starting another.", 409);
    }

    const round = await tx.roomRound.create({
      data: {
        roomId: room.id,
        number: previous.number + 1,
        endsAt: new Date(Date.now() + room.roundSeconds * 1000),
      },
    });
    await tx.gameRoom.update({ where: { id: room.id }, data: { bettingOpen: true } });
    return { success: true, roundNumber: round.number };
  });
}

export async function closeRoom(code: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const room = await tx.gameRoom.findUnique({ where: { code: code.toUpperCase() } });
    if (!room) throw new RoomError("No room found with that code.", 404);
    if (room.hostUserId !== userId) throw new RoomError("You can only manage your own tables.", 403);
    if (room.status === "CLOSED") return { success: true };

    const unsettled = await tx.roomBet.findMany({
      where: { round: { roomId: room.id }, settledAt: null },
    });
    for (const bet of unsettled) {
      const wallet = await tx.wallet.findUnique({ where: { userId: bet.userId } });
      if (!wallet) continue;
      const amount = Number(bet.amount);
      const balanceBefore = Number(wallet.balance);
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: amount } },
      });
      await tx.transaction.create({
        data: {
          userId: bet.userId,
          type: "ADMIN_ADJUSTMENT",
          amount,
          balanceBefore,
          balanceAfter: balanceBefore + amount,
          description: "Multiplayer room closed; unsettled bet refunded",
        },
      });
      await tx.roomBet.update({
        where: { id: bet.id },
        data: { cancelled: true, settledAt: new Date() },
      });
    }

    await tx.roomRound.updateMany({
      where: { roomId: room.id, status: "BETTING" },
      data: { status: "CANCELLED", settledAt: new Date() },
    });
    await tx.gameRoom.update({ where: { id: room.id }, data: { status: "CLOSED", bettingOpen: false } });
    return { success: true };
  }, { isolationLevel: "Serializable" });
}

export async function listManagerRooms(managerId: string) {
  const rooms = await prisma.gameRoom.findMany({
    where: { hostUserId: managerId },
    orderBy: { createdAt: "desc" },
    include: {
      players: { where: { removedAt: null }, select: { id: true } },
      rounds: { orderBy: { number: "desc" }, take: 1, select: { number: true } },
    },
  });
  return {
    success: true,
    rooms: rooms.map((room) => ({
      code: room.code,
      name: room.name,
      status: room.status,
      playersCount: room.players.length,
      latestRound: room.rounds[0]?.number ?? null,
      createdAt: room.createdAt,
    })),
  };
}

export async function getManagerRoomState(code: string, managerId: string) {
  const state = await getRoomState(code, managerId);
  const room = await prisma.gameRoom.findUnique({
    where: { code: code.toUpperCase() },
    select: { id: true, hostUserId: true, maxPlayers: true, roundSeconds: true, minBet: true, maxBet: true },
  });
  if (!room) throw new RoomError("No room found with that code.", 404);
  if (room.hostUserId !== managerId) throw new RoomError("You can only manage your own tables.", 403);

  const memberships = await prisma.roomPlayer.findMany({
    where: { roomId: room.id, removedAt: null },
    select: { userId: true, user: { select: { wallet: { select: { balance: true } } } } },
  });
  const balances = new Map<string, string>(memberships.map((membership) => [membership.userId, membership.user.wallet?.balance.toString() ?? "0"] as const));

  const history = await prisma.roomRound.findMany({
    where: { roomId: room.id },
    orderBy: { number: "desc" },
    take: 20,
    include: {
      bets: {
        orderBy: { createdAt: "asc" },
        include: { user: { select: { username: true } } },
      },
    },
  });
  return {
    ...state,
    userId: managerId,
    room: {
      ...state.room,
      players: state.room.players.map((player) => ({
        ...player,
        balance: balances.get(player.userId) ?? "0",
      })),
      maxPlayers: room.maxPlayers,
      roundSeconds: room.roundSeconds,
      minBet: room.minBet,
      maxBet: room.maxBet,
    },
    roundHistory: history.map((round) => ({
      number: round.number,
      status: round.status,
      dice1: round.dice1,
      dice2: round.dice2,
      total: round.total,
      result: round.result,
      createdAt: round.createdAt,
      bets: round.bets.map((bet) => ({
        username: bet.user.username,
        type: bet.type,
        amount: bet.amount.toString(),
        won: bet.won,
        profit: bet.profit?.toString() ?? null,
        cancelled: bet.cancelled,
      })),
    })),
  };
}

export async function startRoom(code: string, managerId: string) {
  return prisma.$transaction(async (tx) => {
    const room = await tx.gameRoom.findUnique({ where: { code: code.toUpperCase() } });
    if (!room) throw new RoomError("No room found with that code.", 404);
    if (room.hostUserId !== managerId) throw new RoomError("You can only manage your own tables.", 403);
    if (room.status !== "WAITING") throw new RoomError("Only a waiting table can be started.", 409);
    await tx.gameRoom.update({ where: { id: room.id }, data: { status: "OPEN", bettingOpen: true } });
    await tx.roomRound.create({
      data: { roomId: room.id, number: 1, endsAt: new Date(Date.now() + room.roundSeconds * 1000) },
    });
    return { success: true };
  }, { isolationLevel: "Serializable" });
}

export async function setRoomPaused(code: string, managerId: string, paused: boolean) {
  return prisma.$transaction(async (tx) => {
    const room = await tx.gameRoom.findUnique({ where: { code: code.toUpperCase() } });
    if (!room) throw new RoomError("No room found with that code.", 404);
    if (room.hostUserId !== managerId) throw new RoomError("You can only manage your own tables.", 403);

    if (paused) {
      if (room.status === "PAUSED") return { success: true };
      if (room.status !== "OPEN") throw new RoomError("Only a running table can be paused.", 409);
      const round = await tx.roomRound.findFirst({ where: { roomId: room.id }, orderBy: { number: "desc" } });
      if (round?.status === "BETTING") {
        const remaining = Math.max(0, Math.ceil((round.endsAt.getTime() - Date.now()) / 1000));
        await tx.roomRound.update({ where: { id: round.id }, data: { pausedRemainingSeconds: remaining } });
      }
      await tx.gameRoom.update({ where: { id: room.id }, data: { status: "PAUSED" } });
      return { success: true };
    }

    if (room.status !== "PAUSED") throw new RoomError("This table is not paused.", 409);
    const round = await tx.roomRound.findFirst({ where: { roomId: room.id }, orderBy: { number: "desc" } });
    if (round?.status === "BETTING") {
      await tx.roomRound.update({
        where: { id: round.id },
        data: {
          endsAt: new Date(Date.now() + (round.pausedRemainingSeconds ?? room.roundSeconds) * 1000),
          pausedRemainingSeconds: null,
        },
      });
    }
    await tx.gameRoom.update({ where: { id: room.id }, data: { status: "OPEN" } });
    return { success: true };
  }, { isolationLevel: "Serializable" });
}

export async function setRoomBetting(code: string, managerId: string, open: boolean) {
  return prisma.$transaction(async (tx) => {
    const room = await tx.gameRoom.findUnique({ where: { code: code.toUpperCase() } });
    if (!room) throw new RoomError("No room found with that code.", 404);
    if (room.hostUserId !== managerId) throw new RoomError("You can only manage your own tables.", 403);
    if (room.status !== "OPEN") throw new RoomError("Start or resume the table before changing betting.", 409);
    const round = await tx.roomRound.findFirst({ where: { roomId: room.id }, orderBy: { number: "desc" } });
    if (!round || round.status !== "BETTING") throw new RoomError("There is no active betting round.", 409);
    if (open) {
      await tx.roomRound.update({
        where: { id: round.id },
        data: { endsAt: new Date(Date.now() + room.roundSeconds * 1000) },
      });
    }
    await tx.gameRoom.update({ where: { id: room.id }, data: { bettingOpen: open } });
    return { success: true };
  }, { isolationLevel: "Serializable" });
}

export async function removeRoomPlayer(code: string, managerId: string, playerId: string) {
  return prisma.$transaction(async (tx) => {
    const room = await tx.gameRoom.findUnique({ where: { code: code.toUpperCase() } });
    if (!room) throw new RoomError("No room found with that code.", 404);
    if (room.hostUserId !== managerId) throw new RoomError("You can only manage your own tables.", 403);
    if (playerId === managerId) throw new RoomError("The manager cannot remove their own account.", 400);
    const membership = await tx.roomPlayer.findUnique({
      where: { roomId_userId: { roomId: room.id, userId: playerId } },
    });
    if (!membership || membership.removedAt) throw new RoomError("That player is not at this table.", 404);

    const unsettled = await tx.roomBet.findMany({
      where: { settledAt: null, userId: playerId, round: { roomId: room.id } },
    });
    const now = new Date();
    for (const bet of unsettled) {
      const wallet = await tx.wallet.findUnique({ where: { userId: playerId } });
      if (wallet) {
        const amount = Number(bet.amount);
        const before = Number(wallet.balance);
        await tx.wallet.update({ where: { id: wallet.id }, data: { balance: { increment: amount } } });
        await tx.transaction.create({
          data: {
            userId: playerId,
            type: "ADMIN_ADJUSTMENT",
            amount,
            balanceBefore: before,
            balanceAfter: before + amount,
            description: "Table manager removed player; unsettled bet returned",
          },
        });
      }
      await tx.roomBet.update({ where: { id: bet.id }, data: { cancelled: true, settledAt: now } });
    }
    await tx.roomPlayer.update({ where: { id: membership.id }, data: { removedAt: now } });
    return { success: true };
  }, { isolationLevel: "Serializable" });
}

export async function resetRoomPlayerBalance(code: string, managerId: string, playerId: string) {
  return prisma.$transaction(async (tx) => {
    const room = await tx.gameRoom.findUnique({ where: { code: code.toUpperCase() } });
    if (!room) throw new RoomError("No room found with that code.", 404);
    if (room.hostUserId !== managerId) throw new RoomError("You can only manage your own tables.", 403);
    const membership = await tx.roomPlayer.findUnique({
      where: { roomId_userId: { roomId: room.id, userId: playerId } },
    });
    if (!membership || membership.removedAt) throw new RoomError("That player is not at this table.", 404);

    const unsettled = await tx.roomBet.findMany({
      where: { settledAt: null, userId: playerId, round: { roomId: room.id } },
    });
    const now = new Date();
    for (const bet of unsettled) {
      const wallet = await tx.wallet.findUnique({ where: { userId: playerId } });
      if (wallet) {
        const amount = Number(bet.amount);
        const before = Number(wallet.balance);
        await tx.wallet.update({ where: { id: wallet.id }, data: { balance: { increment: amount } } });
        await tx.transaction.create({
          data: {
            userId: playerId,
            type: "ADMIN_ADJUSTMENT",
            amount,
            balanceBefore: before,
            balanceAfter: before + amount,
            description: "Table manager reset balance; unsettled bet returned",
          },
        });
      }
      await tx.roomBet.update({ where: { id: bet.id }, data: { cancelled: true, settledAt: now } });
    }

    const wallet = await tx.wallet.findUnique({ where: { userId: playerId } });
    if (!wallet) throw new RoomError("Player wallet is unavailable.", 404);
    const balanceBefore = Number(wallet.balance);
    const difference = 10_000 - balanceBefore;
    await tx.wallet.update({ where: { id: wallet.id }, data: { balance: 10_000 } });
    if (difference !== 0) {
      await tx.transaction.create({
        data: {
          userId: playerId,
          type: "ADMIN_ADJUSTMENT",
          amount: difference,
          balanceBefore,
          balanceAfter: 10_000,
          description: "Table manager reset virtual balance",
        },
      });
    }
    return { success: true };
  }, { isolationLevel: "Serializable" });
}
