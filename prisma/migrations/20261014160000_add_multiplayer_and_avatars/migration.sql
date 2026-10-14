-- Store profile images separately so ordinary session lookups do not load image bytes.
CREATE TABLE "UserAvatar" (
    "userId" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "mimeType" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserAvatar_pkey" PRIMARY KEY ("userId")
);

CREATE TYPE "RoomStatus" AS ENUM ('OPEN', 'CLOSED');
CREATE TYPE "RoomRoundStatus" AS ENUM ('BETTING', 'ROLLED', 'CANCELLED');

CREATE TABLE "GameRoom" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hostUserId" TEXT NOT NULL,
    "status" "RoomStatus" NOT NULL DEFAULT 'OPEN',
    "maxPlayers" INTEGER NOT NULL DEFAULT 6,
    "roundSeconds" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GameRoom_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RoomPlayer" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RoomPlayer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RoomRound" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "status" "RoomRoundStatus" NOT NULL DEFAULT 'BETTING',
    "dice1" INTEGER,
    "dice2" INTEGER,
    "total" INTEGER,
    "result" "BetType",
    "endsAt" TIMESTAMP(3) NOT NULL,
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RoomRound_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RoomBet" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "BetType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "won" BOOLEAN,
    "profit" DECIMAL(12,2),
    "cancelled" BOOLEAN NOT NULL DEFAULT false,
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RoomBet_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GameRoom_code_key" ON "GameRoom"("code");
CREATE INDEX "GameRoom_hostUserId_idx" ON "GameRoom"("hostUserId");
CREATE INDEX "GameRoom_status_idx" ON "GameRoom"("status");
CREATE UNIQUE INDEX "RoomPlayer_roomId_userId_key" ON "RoomPlayer"("roomId", "userId");
CREATE INDEX "RoomPlayer_userId_idx" ON "RoomPlayer"("userId");
CREATE UNIQUE INDEX "RoomRound_roomId_number_key" ON "RoomRound"("roomId", "number");
CREATE INDEX "RoomRound_roomId_status_idx" ON "RoomRound"("roomId", "status");
CREATE UNIQUE INDEX "RoomBet_roundId_userId_key" ON "RoomBet"("roundId", "userId");
CREATE INDEX "RoomBet_userId_idx" ON "RoomBet"("userId");
CREATE INDEX "RoomBet_roundId_settledAt_idx" ON "RoomBet"("roundId", "settledAt");

ALTER TABLE "UserAvatar" ADD CONSTRAINT "UserAvatar_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GameRoom" ADD CONSTRAINT "GameRoom_hostUserId_fkey"
    FOREIGN KEY ("hostUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoomPlayer" ADD CONSTRAINT "RoomPlayer_roomId_fkey"
    FOREIGN KEY ("roomId") REFERENCES "GameRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoomPlayer" ADD CONSTRAINT "RoomPlayer_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoomRound" ADD CONSTRAINT "RoomRound_roomId_fkey"
    FOREIGN KEY ("roomId") REFERENCES "GameRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoomBet" ADD CONSTRAINT "RoomBet_roundId_fkey"
    FOREIGN KEY ("roundId") REFERENCES "RoomRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoomBet" ADD CONSTRAINT "RoomBet_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
