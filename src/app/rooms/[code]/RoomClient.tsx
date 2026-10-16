"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import Dice from "@/components/Dice";

type BetType = "UP" | "SEVEN" | "DOWN";
type RoomPlayer = { userId: string; username: string; avatarUrl: string | null };
type RoomBet = { userId: string; username: string; type: BetType; amount: string; won: boolean | null; profit: string | null; cancelled: boolean };
type RoomState = {
  code: string;
  isHost: boolean;
  name: string;
  status: "WAITING" | "OPEN" | "PAUSED" | "CLOSED";
  bettingOpen: boolean;
  players: RoomPlayer[];
  currentRound: null | {
    id: string;
    number: number;
    status: "BETTING" | "ROLLED" | "CANCELLED";
    endsAt: string;
    dice1: number | null;
    dice2: number | null;
    total: number | null;
    result: BetType | null;
    bets: RoomBet[];
  };
};

function PlayerAvatar({ player }: { player: RoomPlayer }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-cyan-300/30 bg-cyan-400/10 text-sm font-bold text-cyan-200">
      {player.avatarUrl && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={player.avatarUrl} alt="" className="h-full w-full object-cover" onError={() => setFailed(true)} />
      ) : player.username.slice(0, 1).toUpperCase()}
    </span>
  );
}

export default function RoomClient({ code, userId }: { code: string; userId: string }) {
  const router = useRouter();
  const [room, setRoom] = useState<RoomState | null>(null);
  const [balance, setBalance] = useState(0);
  const [betType, setBetType] = useState<BetType>("UP");
  const [amount, setAmount] = useState(100);
  const [now, setNow] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [joining, setJoining] = useState(false);
  const [animating, setAnimating] = useState(false);
  const seenRoll = useRef<string | null>(null);

  const loadRoom = useCallback(async () => {
    try {
      const response = await fetch(`/api/rooms/${encodeURIComponent(code)}`, { cache: "no-store" });
      const data = await response.json();
      if (response.status === 401) {
        router.replace("/login");
        return;
      }
      if (response.status === 403 && data.message?.includes("Join this room")) {
        setRoom(null);
        setError(data.message);
        return;
      }
      if (!response.ok || !data.success) throw new Error(data.message || "Could not load room.");
      const nextRoom = data.room as RoomState;
      const nextRound = nextRoom.currentRound;
      if (nextRound?.status === "ROLLED" && seenRoll.current !== nextRound.id) {
        seenRoll.current = nextRound.id;
        setAnimating(true);
        window.setTimeout(() => setAnimating(false), 1250);
      }
      setRoom(nextRoom);
      setBalance(Number(data.balance));
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load room.");
    }
  }, [code, router]);

  useEffect(() => {
    let active = true;
    let timer: number;
    const poll = async () => {
      if (!active) return;
      await loadRoom();
      if (active) timer = window.setTimeout(poll, 2000);
    };
    void poll();
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [loadRoom]);

  useEffect(() => {
    const firstFrame = window.requestAnimationFrame(() => setNow(Date.now()));
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.clearInterval(timer);
    };
  }, []);


  const currentRound = room?.currentRound ?? null;
  const remainingSeconds = currentRound?.status === "BETTING"
    ? Math.max(0, Math.ceil((new Date(currentRound.endsAt).getTime() - now) / 1000))
    : 0;
  const timerLabel = `${String(Math.floor(remainingSeconds / 60)).padStart(2, "0")}:${String(remainingSeconds % 60).padStart(2, "0")}`;

  async function performAction(action: string, extra: Record<string, unknown> = {}) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/rooms/${encodeURIComponent(code)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Could not complete that action.");
      setMessage(action === "bet" ? "Bet placed. Good luck!" : "Room updated.");
      setError("");
      await loadRoom();
      return true;
    } catch (actionError) {
      setMessage("");
      setError(actionError instanceof Error ? actionError.message : "Could not complete that action.");
      return false;
    } finally {
      setBusy(false);
    }
  }


  async function submitBet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!Number.isInteger(amount) || amount <= 0 || amount > balance) {
      setError("Enter a whole number within your available balance.");
      return;
    }
    await performAction("bet", { betType, amount });
  }


  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setMessage("Room code copied.");
    } catch {
      setMessage(`Share this code: ${code}`);
    }
  }

  async function joinRoom() {
    setJoining(true);
    await performAction("join");
    setJoining(false);
  }

  const myBet = currentRound?.bets.find((bet) => bet.userId === userId);
  const pips1 = currentRound?.dice1 ?? 1;
  const pips2 = currentRound?.dice2 ?? 1;
  const isClosed = room?.status === "CLOSED";
  const acceptingBets = room?.status === "OPEN" && room.bettingOpen && currentRound?.status === "BETTING" && remainingSeconds > 0;

  return (
    <main className="game-page min-h-screen bg-[#070b14] px-3 py-5 text-white sm:px-5 sm:py-9">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <a href="/multiplayer" className="text-sm font-semibold text-cyan-300 hover:text-cyan-200">← Multiplayer lobby</a>
          {room && <div className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-300">Balance <span className="ml-2 font-bold text-cyan-300">₹{balance.toLocaleString()}</span></div>}
        </div>

        {!room && error.includes("Join this room") ? (
          <section className="mx-auto mt-16 max-w-xl rounded-3xl border border-cyan-300/20 bg-[#0d1422] p-8 text-center shadow-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-300">Room {code}</p>
            <h1 className="mt-3 text-3xl font-black">Ready to join?</h1>
            <p className="mt-3 text-slate-400">Join this table to see the players and take part in the next roll.</p>
            <button onClick={joinRoom} disabled={joining || busy} className="mt-6 rounded-xl bg-cyan-400 px-6 py-3 font-extrabold text-slate-950 hover:bg-cyan-300 disabled:opacity-50">{joining ? "Joining…" : "Join room"}</button>
            <p aria-live="polite" className="mt-4 text-sm text-amber-200">{error}</p>
          </section>
        ) : !room ? (
          <section className="mx-auto mt-16 max-w-xl rounded-3xl border border-slate-800 bg-[#0d1422] p-8 text-center">
            <div className="text-sm font-semibold text-amber-200">{error || "Connecting to room…"}</div>
            <a href="/multiplayer" className="mt-5 inline-block rounded-xl border border-slate-700 px-5 py-3 font-bold text-slate-200">Back to lobby</a>
          </section>
        ) : (
          <>
            <header className="mt-6 flex flex-col gap-4 rounded-3xl border border-cyan-300/20 bg-gradient-to-br from-[#12243a] to-[#0d1422] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-300">Private game room</p>
                <h1 className="mt-2 text-3xl font-black sm:text-4xl">{room.name}</h1>
                <p className="mt-2 text-sm text-slate-400">{room.players.length} players at the table</p>
              </div>
              <button onClick={copyCode} className="rounded-2xl border border-cyan-300/30 bg-[#070b14]/60 px-5 py-4 text-left transition hover:border-cyan-200">
                <span className="block text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Tap to copy join code</span>
                <span className="mt-1 block font-mono text-2xl font-black tracking-[0.25em] text-cyan-200">{room.code}</span>
              </button>
            </header>

            {isClosed && <div className="mt-5 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4 font-semibold text-amber-100">The host closed this room. Any unsettled bets were returned.</div>}

            <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
              <div className="space-y-5">
                <section className="rounded-3xl border border-slate-800 bg-[#0d1422] p-5 sm:p-7">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Round {currentRound?.number ?? "—"}</p>
                      <h2 className="mt-1 text-2xl font-black">{!currentRound ? "Waiting for the host" : currentRound.status === "BETTING" ? (room.bettingOpen ? "Place your prediction" : "Betting is closed") : currentRound.status === "ROLLED" ? "Round result" : "Round ended"}</h2>
                    </div>
                    {currentRound?.status === "BETTING" && (
                      <div className="rounded-xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-center">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">{room.bettingOpen ? "Betting closes" : "Bets closed"}</span>
                        <span className="font-mono text-2xl font-black text-cyan-200">{timerLabel}</span>
                      </div>
                    )}
                  </div>

                  <div className="my-7 rounded-2xl border border-cyan-300/10 bg-[#080e19] px-3 py-8 sm:py-10">
                    <div className="flex justify-center gap-5 sm:gap-8">
                      <Dice value={pips1} rolling={animating} />
                      <Dice value={pips2} rolling={animating} />
                    </div>
                    <p className="mt-6 text-center text-sm font-bold uppercase tracking-[0.2em] text-slate-500">Total</p>
                    <p className="mt-1 text-center text-5xl font-black text-cyan-200">{currentRound?.total ?? "—"}</p>
                    {currentRound?.result && <p className="mt-2 text-center text-sm font-bold text-white">{currentRound.result === "SEVEN" ? "EXACT SEVEN" : currentRound.result === "UP" ? "SEVEN UP" : "SEVEN DOWN"}</p>}
                  </div>

                  {acceptingBets && (
                    myBet ? (
                      <div className="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 p-4 text-center text-cyan-100">Your bet: <strong>₹{Number(myBet.amount).toLocaleString()} on {myBet.type}</strong></div>
                    ) : (
                      <form onSubmit={submitBet} className="space-y-4">
                        <div className="grid grid-cols-3 gap-2">
                          {(["DOWN", "SEVEN", "UP"] as BetType[]).map((type) => (
                            <button key={type} type="button" onClick={() => setBetType(type)} className={`rounded-xl border px-2 py-3 text-sm font-extrabold transition ${betType === type ? "border-cyan-300 bg-cyan-400/15 text-cyan-100" : "border-slate-700 bg-[#080e19] text-slate-400 hover:border-slate-500"}`}>
                              {type === "DOWN" ? "7 DOWN" : type === "UP" ? "7 UP" : "EXACT 7"}
                            </button>
                          ))}
                        </div>
                        <div className="flex flex-col gap-3 sm:flex-row">
                          <label className="flex-1 text-xs font-bold uppercase tracking-wider text-slate-500">Virtual bet amount
                            <input type="number" min={1} step={1} value={amount} onChange={(event) => setAmount(Number(event.target.value))} className="mt-2 w-full rounded-xl border border-slate-700 bg-[#080e19] px-4 py-3 text-base font-bold text-white outline-none focus:border-cyan-400" />
                          </label>
                          <button disabled={busy || remainingSeconds === 0} className="self-end rounded-xl bg-cyan-400 px-6 py-3.5 font-extrabold text-slate-950 hover:bg-cyan-300 disabled:opacity-50">{busy ? "Placing…" : "Place bet"}</button>
                        </div>
                      </form>
                    )
                  )}

                  {currentRound?.status === "ROLLED" && !isClosed && <p className="text-center text-sm text-slate-400">Waiting for the host to start the next round.</p>}
                  {currentRound?.status === "BETTING" && !acceptingBets && (
                    <p className="mt-4 text-center text-xs text-slate-500">
                      {room.status === "PAUSED" ? "The table is paused by its host." : !room.bettingOpen ? "The host closed betting for this round." : "The timer ended. Waiting for the host to roll."}
                    </p>
                  )}
                  {room.status === "WAITING" && <p className="mt-4 text-center text-sm text-slate-400">The host will start the game when everyone is ready.</p>}
                </section>

                {room.isHost && !isClosed && (
                  <section className="rounded-3xl border border-cyan-300/20 bg-[#0d1422] p-5 sm:p-6">
                    <h2 className="text-lg font-extrabold">Host controls</h2>
                    <p className="mt-1 text-sm text-slate-400">These controls apply only to the room you created.</p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      {room.status === "WAITING" && <button onClick={() => void performAction("start")} disabled={busy} className="rounded-xl bg-cyan-400 px-5 py-3 font-extrabold text-slate-950 hover:bg-cyan-300 disabled:opacity-50">Start game</button>}
                      {room.status === "OPEN" && currentRound?.status === "BETTING" && <button onClick={() => void performAction("roll")} disabled={busy} className="rounded-xl bg-cyan-400 px-5 py-3 font-extrabold text-slate-950 hover:bg-cyan-300 disabled:opacity-50">{busy ? "Rolling…" : "Roll dice"}</button>}
                      {room.status === "OPEN" && currentRound?.status === "ROLLED" && <button onClick={() => void performAction("next")} disabled={busy} className="rounded-xl bg-cyan-400 px-5 py-3 font-extrabold text-slate-950 hover:bg-cyan-300 disabled:opacity-50">Start next round</button>}
                      <button onClick={() => { if (window.confirm("End this room? Any unsettled bets will be returned.")) void performAction("end"); }} disabled={busy} className="rounded-xl border border-rose-300/30 px-5 py-3 font-bold text-rose-200 hover:bg-rose-400/10 disabled:opacity-50">End room</button>
                    </div>
                  </section>
                )}

                <section className="rounded-3xl border border-slate-800 bg-[#0d1422] p-5 sm:p-7">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-extrabold">Players at the table</h2>
                    <span className="text-xs font-bold text-slate-500">{room.players.length} joined</span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {room.players.map((player) => (
                      <div key={player.userId} className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-[#080e19] p-3">
                        <PlayerAvatar player={player} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-bold text-slate-100">{player.username}{player.userId === userId ? " (you)" : ""}</p>
                          <p className="text-xs text-slate-500">Player</p>
                        </div>
                        {currentRound?.bets.some((bet) => bet.userId === player.userId) && <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[10px] font-bold uppercase text-emerald-300">Ready</span>}
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <aside className="space-y-5">
<section className="rounded-3xl border border-slate-800 bg-[#0d1422] p-5">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-lg font-extrabold">This round’s bets</h2>
                    <span className="text-xs text-slate-500">{currentRound?.bets.length ?? 0}</span>
                  </div>
                  <div className="mt-4 space-y-2">
                    {currentRound?.bets.length ? currentRound.bets.map((bet) => (
                      <div key={bet.userId} className="flex items-center justify-between gap-2 rounded-xl bg-[#080e19] px-3 py-2.5 text-sm">
                        <span className="min-w-0 truncate font-semibold text-slate-300">{bet.username}</span>
                        <span className="shrink-0 text-right text-cyan-200">₹{Number(bet.amount).toLocaleString()} · {bet.type}</span>
                      </div>
                    )) : <p className="rounded-xl bg-[#080e19] px-3 py-4 text-center text-sm text-slate-500">No bets yet. Be the first.</p>}
                  </div>
                </section>

                <a href="/profile" className="block rounded-2xl border border-slate-800 bg-[#0d1422] p-4 text-center text-sm font-semibold text-slate-300 transition hover:border-cyan-300/30 hover:text-cyan-200">Manage your player photo</a>
              </aside>
            </div>
          </>
        )}

        <p aria-live="polite" className="mt-4 min-h-6 text-center text-sm text-amber-200">{message || error}</p>
      </div>
    </main>
  );
}
