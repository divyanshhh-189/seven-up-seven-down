"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

type BetType = "UP" | "SEVEN" | "DOWN";
type RoomStatus = "WAITING" | "OPEN" | "PAUSED" | "CLOSED";
type ManagerRoomSummary = {
  code: string;
  name: string;
  status: RoomStatus;
  playersCount: number;
  latestRound: number | null;
};
type ManagerPlayer = {
  userId: string;
  username: string;
  avatarUrl: string | null;
  balance: string;
};
type ManagerBet = {
  userId?: string;
  username: string;
  type: BetType;
  amount: string;
  won: boolean | null;
  profit: string | null;
  cancelled: boolean;
};
type ManagerRound = {
  id?: string;
  number: number;
  status: "BETTING" | "ROLLED" | "CANCELLED";
  endsAt?: string;
  dice1: number | null;
  dice2: number | null;
  total: number | null;
  result: BetType | null;
  bets: ManagerBet[];
};
type ManagerRoom = {
  code: string;
  name: string;
  status: RoomStatus;
  bettingOpen: boolean;
  maxPlayers: number;
  roundSeconds: number;
  minBet: number;
  maxBet: number;
  players: ManagerPlayer[];
  currentRound: ManagerRound | null;
};
type RoomHistory = {
  number: number;
  status: "BETTING" | "ROLLED" | "CANCELLED";
  dice1: number | null;
  dice2: number | null;
  total: number | null;
  result: BetType | null;
  bets: ManagerBet[];
};
type ManagerState = { userId: string; room: ManagerRoom; roundHistory: RoomHistory[] };

const inputClass = "mt-2 w-full rounded-xl border border-slate-700 bg-[#080e19] px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400";
const buttonClass = "rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-bold text-slate-200 transition hover:border-cyan-300/50 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40";

function formatOutcome(result: BetType | null) {
  if (!result) return "—";
  return result === "SEVEN" ? "EXACT SEVEN" : result === "UP" ? "SEVEN UP" : "SEVEN DOWN";
}

export default function ManagerClient() {
  const [rooms, setRooms] = useState<ManagerRoomSummary[]>([]);
  const [code, setCode] = useState("");
  const [room, setRoom] = useState<ManagerState | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [newName, setNewName] = useState("Lucky Table");
  const [newMaxPlayers, setNewMaxPlayers] = useState(6);
  const [newRoundSeconds, setNewRoundSeconds] = useState(30);
  const [newMinBet, setNewMinBet] = useState(1);
  const [newMaxBet, setNewMaxBet] = useState(10000);
  const [settingsName, setSettingsName] = useState("");
  const [settingsMaxPlayers, setSettingsMaxPlayers] = useState(6);
  const [settingsRoundSeconds, setSettingsRoundSeconds] = useState(30);
  const [settingsMinBet, setSettingsMinBet] = useState(1);
  const [settingsMaxBet, setSettingsMaxBet] = useState(10000);
  const loadedSettingsFor = useRef("");

  const loadRooms = useCallback(async () => {
    try {
      const response = await fetch("/api/manager/rooms", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Could not load your tables.");
      const nextRooms = data.rooms as ManagerRoomSummary[];
      setRooms(nextRooms);
      setCode((current) => current || nextRooms[0]?.code || "");
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load your tables.");
    }
  }, []);

  useEffect(() => {
    void loadRooms();
    const interval = window.setInterval(() => void loadRooms(), 4000);
    return () => window.clearInterval(interval);
  }, [loadRooms]);

  useEffect(() => {
    if (!code) {
      setRoom(null);
      return;
    }
    let active = true;
    let timer = 0;
    const poll = async () => {
      try {
        const response = await fetch("/api/manager/rooms/" + encodeURIComponent(code), { cache: "no-store" });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.message || "Could not load manager table.");
        if (active) {
          const nextState = data as ManagerState;
          setRoom(nextState);
          if (loadedSettingsFor.current !== code) {
            setSettingsName(nextState.room.name);
            setSettingsMaxPlayers(nextState.room.maxPlayers);
            setSettingsRoundSeconds(nextState.room.roundSeconds);
            setSettingsMinBet(nextState.room.minBet);
            setSettingsMaxBet(nextState.room.maxBet);
            loadedSettingsFor.current = code;
          }
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Could not load manager table.");
      }
      if (active) timer = window.setTimeout(poll, 1800);
    };
    loadedSettingsFor.current = "";
    void poll();
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [code]);

  async function performAction(action: string, extra: Record<string, unknown> = {}) {
    if (!code) return false;
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/manager/rooms/" + encodeURIComponent(code), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Could not complete that manager action.");
      if (action === "settings") loadedSettingsFor.current = "";
      setMessage(action === "roll" ? "Dice rolled and bets settled." : "Table updated.");
      await loadRooms();
      return true;
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Could not complete that manager action.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function createRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/manager/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          maxPlayers: newMaxPlayers,
          roundSeconds: newRoundSeconds,
          minBet: newMinBet,
          maxBet: newMaxBet,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Could not create table.");
      setCode(data.code);
      setMessage("Table created. Share the player link when you are ready.");
      await loadRooms();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Could not create table.");
    } finally {
      setBusy(false);
    }
  }

  async function copyPlayerLink() {
    if (!code) return;
    const url = window.location.origin + "/rooms/" + encodeURIComponent(code);
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Player link copied.");
    } catch {
      setMessage("Share this player link: " + url);
    }
  }

  const selected = room?.room;
  const currentRound = selected?.currentRound ?? null;
  const activeRound = currentRound?.status === "BETTING";
  const isClosed = selected?.status === "CLOSED";

  return (
    <main className="min-h-screen bg-[#070b14] px-4 py-7 text-white sm:px-6 sm:py-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <a href="/multiplayer" className="text-sm font-semibold text-cyan-300 hover:text-cyan-200">← Player lobby</a>
          <span className="rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-cyan-200">Private manager space</span>
        </div>

        <header className="mt-7">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-300">Table Manager</p>
          <h1 className="mt-2 text-4xl font-black sm:text-5xl">Your tables, your call.</h1>
          <p className="mt-3 max-w-2xl text-slate-400">Create a table, set its rules, and control every round here. Players only get the shared room link and player view.</p>
        </header>

        <div className="mt-8 grid gap-5 lg:grid-cols-[330px_minmax(0,1fr)]">
          <aside className="space-y-5">
            <section className="rounded-3xl border border-cyan-300/20 bg-[#0d1422] p-5">
              <h2 className="text-lg font-extrabold">Create a table</h2>
              <form onSubmit={createRoom} className="mt-4 space-y-3">
                <label className="block text-xs font-bold text-slate-400">Table name
                  <input value={newName} maxLength={40} onChange={(event) => setNewName(event.target.value)} className={inputClass} />
                </label>
                <label className="block text-xs font-bold text-slate-400">Player limit
                  <select value={newMaxPlayers} onChange={(event) => setNewMaxPlayers(Number(event.target.value))} className={inputClass}>
                    {[2, 4, 6, 8, 10, 12].map((count) => <option key={count} value={count}>{count} players</option>)}
                  </select>
                </label>
                <label className="block text-xs font-bold text-slate-400">Betting timer
                  <select value={newRoundSeconds} onChange={(event) => setNewRoundSeconds(Number(event.target.value))} className={inputClass}>
                    {[15, 20, 30, 45, 60, 90, 120].map((seconds) => <option key={seconds} value={seconds}>{seconds} seconds</option>)}
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-xs font-bold text-slate-400">Minimum bet
                    <input type="number" min={1} value={newMinBet} onChange={(event) => setNewMinBet(Number(event.target.value))} className={inputClass} />
                  </label>
                  <label className="block text-xs font-bold text-slate-400">Maximum bet
                    <input type="number" min={newMinBet} value={newMaxBet} onChange={(event) => setNewMaxBet(Number(event.target.value))} className={inputClass} />
                  </label>
                </div>
                <button disabled={busy} className="w-full rounded-xl bg-cyan-400 px-4 py-3 font-extrabold text-slate-950 hover:bg-cyan-300 disabled:opacity-50">{busy ? "Creating…" : "Create waiting table"}</button>
              </form>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-[#0d1422] p-5">
              <h2 className="text-lg font-extrabold">Your tables</h2>
              <div className="mt-4 space-y-2">
                {rooms.length === 0 && <p className="rounded-xl bg-[#080e19] p-4 text-sm text-slate-500">No tables yet.</p>}
                {rooms.map((item) => (
                  <button key={item.code} onClick={() => setCode(item.code)} className={"w-full rounded-xl border p-3 text-left transition " + (code === item.code ? "border-cyan-300/50 bg-cyan-400/10" : "border-slate-800 bg-[#080e19] hover:border-slate-600")}>
                    <span className="flex items-center justify-between gap-2">
                      <strong className="truncate">{item.name}</strong>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-200">{item.status}</span>
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">{item.playersCount} players · {item.latestRound ? "Round " + item.latestRound : "Not started"} · {item.code}</span>
                  </button>
                ))}
              </div>
            </section>
          </aside>

          <section className="min-w-0 space-y-5">
            {!selected ? (
              <div className="rounded-3xl border border-slate-800 bg-[#0d1422] p-8 text-center text-slate-400">Create a table or select one to manage it.</div>
            ) : (
              <>
                <header className="flex flex-col gap-4 rounded-3xl border border-cyan-300/20 bg-gradient-to-br from-[#12243a] to-[#0d1422] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">{selected.status} · {selected.players.length} players</p>
                    <h2 className="mt-2 text-3xl font-black">{selected.name}</h2>
                    <p className="mt-2 font-mono text-sm tracking-[0.2em] text-slate-400">ROOM CODE {selected.code}</p>
                  </div>
                  <button onClick={() => void copyPlayerLink()} className="rounded-xl border border-cyan-300/30 bg-[#070b14]/60 px-4 py-3 text-sm font-bold text-cyan-100 hover:border-cyan-200">Copy player link</button>
                </header>

                <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_350px]">
                  <div className="space-y-5">
                    <section className="rounded-3xl border border-slate-800 bg-[#0d1422] p-5 sm:p-6">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Round {currentRound?.number ?? "—"}</p>
                          <h3 className="mt-1 text-2xl font-black">{!currentRound ? "Waiting to start" : currentRound.status === "BETTING" ? "Betting round" : currentRound.status === "ROLLED" ? "Round settled" : "Round ended"}</h3>
                        </div>
                        <div className="rounded-xl border border-slate-700 bg-[#080e19] px-4 py-2 text-sm text-slate-300">
                          {selected.bettingOpen ? "Bets open" : "Bets closed"} · ₹{selected.minBet.toLocaleString()}–₹{selected.maxBet.toLocaleString()}
                        </div>
                      </div>
                      <div className="my-5 rounded-2xl border border-cyan-300/10 bg-[#080e19] p-5 text-center">
                        <p className="text-4xl font-black text-cyan-200">{currentRound?.dice1 ?? "—"} <span className="text-slate-600">+</span> {currentRound?.dice2 ?? "—"}</p>
                        <p className="mt-2 text-sm font-bold text-slate-400">Total {currentRound?.total ?? "—"} · {formatOutcome(currentRound?.result ?? null)}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selected.status === "WAITING" && <button onClick={() => void performAction("start")} disabled={busy} className="rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-extrabold text-slate-950 disabled:opacity-40">Start table</button>}
                        {selected.status === "OPEN" && <button onClick={() => void performAction("pause")} disabled={busy} className={buttonClass}>Pause table</button>}
                        {selected.status === "PAUSED" && <button onClick={() => void performAction("resume")} disabled={busy} className="rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-extrabold text-slate-950 disabled:opacity-40">Resume table</button>}
                        {selected.status === "OPEN" && activeRound && (
                          <button onClick={() => void performAction(selected.bettingOpen ? "close-betting" : "open-betting")} disabled={busy} className={buttonClass}>
                            {selected.bettingOpen ? "Close betting" : "Open betting"}
                          </button>
                        )}
                        {selected.status === "OPEN" && activeRound && <button onClick={() => void performAction("roll")} disabled={busy} className="rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-extrabold text-slate-950 disabled:opacity-40">{busy ? "Rolling…" : "Roll and settle"}</button>}
                        {selected.status === "OPEN" && currentRound?.status === "ROLLED" && <button onClick={() => void performAction("next")} disabled={busy} className="rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-extrabold text-slate-950 disabled:opacity-40">Start next round</button>}
                        {selected.status !== "CLOSED" && <button onClick={() => { if (window.confirm("End this table? Unsettled bets will be refunded.")) void performAction("end"); }} disabled={busy} className="rounded-xl border border-red-400/30 px-4 py-2.5 text-sm font-bold text-red-200 hover:bg-red-400/10 disabled:opacity-40">End table</button>}
                      </div>
                    </section>

                    <section className="rounded-3xl border border-slate-800 bg-[#0d1422] p-5 sm:p-6">
                      <h3 className="text-lg font-extrabold">Players and balances</h3>
                      <div className="mt-4 space-y-2">
                        {selected.players.map((player) => (
                          <div key={player.userId} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-[#080e19] p-3">
                            <div>
                              <p className="font-bold">{player.username}{player.userId === room.userId ? " (you)" : ""}</p>
                              <p className="text-xs text-slate-500">Play-money balance: ₹{Number(player.balance).toLocaleString()}</p>
                            </div>
                            {player.userId !== room.userId && (
                              <div className="flex flex-wrap gap-2">
                                <button onClick={() => { if (window.confirm("Reset this player's virtual balance to ₹10,000?")) void performAction("reset-balance", { playerId: player.userId }); }} disabled={busy} className={buttonClass}>Reset play money</button>
                                <button onClick={() => { if (window.confirm("Remove this player from the table? Unsettled bets will be returned and they cannot rejoin.")) void performAction("remove-player", { playerId: player.userId }); }} disabled={busy || selected.status === "CLOSED"} className="rounded-xl border border-red-400/20 px-3 py-2 text-xs font-bold text-red-200 hover:bg-red-400/10 disabled:opacity-40">Remove</button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="rounded-3xl border border-slate-800 bg-[#0d1422] p-5 sm:p-6">
                      <h3 className="text-lg font-extrabold">Recent round record</h3>
                      <div className="mt-4 space-y-3">
                        {room?.roundHistory.length ? room.roundHistory.map((round) => (
                          <article key={round.number} className="rounded-2xl border border-slate-800 bg-[#080e19] p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <strong>Round {round.number}</strong>
                              <span className="text-sm text-cyan-200">{round.dice1 ?? "—"} + {round.dice2 ?? "—"} = {round.total ?? "—"} · {formatOutcome(round.result)}</span>
                            </div>
                            <div className="mt-3 space-y-1">
                              {round.bets.map((bet, index) => (
                                <div key={round.number + "-" + index} className="flex justify-between gap-2 text-xs text-slate-400">
                                  <span>{bet.username} · {bet.type} · ₹{Number(bet.amount).toLocaleString()}</span>
                                  <span>{bet.cancelled ? "Refunded" : bet.won === null ? "Pending" : bet.won ? "Won" : "Lost"}</span>
                                </div>
                              ))}
                              {round.bets.length === 0 && <p className="text-xs text-slate-600">No bets in this round.</p>}
                            </div>
                          </article>
                        )) : <p className="text-sm text-slate-500">Round results and bet records appear here.</p>}
                      </div>
                    </section>
                  </div>

                  <aside className="space-y-5">
                    <section className="rounded-3xl border border-cyan-300/20 bg-[#0d1422] p-5">
                      <h3 className="text-lg font-extrabold">Table settings</h3>
                      <form onSubmit={(event) => { event.preventDefault(); void performAction("settings", { name: settingsName, maxPlayers: settingsMaxPlayers, roundSeconds: settingsRoundSeconds, minBet: settingsMinBet, maxBet: settingsMaxBet }); }} className="mt-4 space-y-3">
                        <label className="block text-xs font-bold text-slate-400">Table name
                          <input value={settingsName} maxLength={40} onChange={(event) => setSettingsName(event.target.value)} className={inputClass} />
                        </label>
                        <label className="block text-xs font-bold text-slate-400">Player limit
                          <select value={settingsMaxPlayers} onChange={(event) => setSettingsMaxPlayers(Number(event.target.value))} className={inputClass}>
                            {[2, 4, 6, 8, 10, 12].map((count) => <option key={count} value={count}>{count} players</option>)}
                          </select>
                        </label>
                        <label className="block text-xs font-bold text-slate-400">Round timer
                          <select value={settingsRoundSeconds} onChange={(event) => setSettingsRoundSeconds(Number(event.target.value))} className={inputClass}>
                            {[15, 20, 30, 45, 60, 90, 120].map((seconds) => <option key={seconds} value={seconds}>{seconds} seconds</option>)}
                          </select>
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <label className="block text-xs font-bold text-slate-400">Min bet
                            <input type="number" min={1} value={settingsMinBet} onChange={(event) => setSettingsMinBet(Number(event.target.value))} className={inputClass} />
                          </label>
                          <label className="block text-xs font-bold text-slate-400">Max bet
                            <input type="number" min={settingsMinBet} value={settingsMaxBet} onChange={(event) => setSettingsMaxBet(Number(event.target.value))} className={inputClass} />
                          </label>
                        </div>
                        <button disabled={busy || isClosed} className="w-full rounded-xl border border-cyan-300/30 bg-cyan-400/10 px-4 py-2.5 text-sm font-extrabold text-cyan-100 hover:bg-cyan-400/20 disabled:opacity-40">Save settings</button>
                      </form>
                    </section>
                    <section className="rounded-3xl border border-slate-800 bg-[#0d1422] p-5">
                      <h3 className="text-lg font-extrabold">Current bets</h3>
                      <div className="mt-4 space-y-2">
                        {currentRound?.bets.length ? currentRound.bets.map((bet, index) => (
                          <div key={bet.userId ?? index} className="flex justify-between gap-2 rounded-xl bg-[#080e19] px-3 py-2.5 text-sm">
                            <span className="truncate text-slate-300">{bet.username} · {bet.type}</span>
                            <span className="shrink-0 text-cyan-200">₹{Number(bet.amount).toLocaleString()}</span>
                          </div>
                        )) : <p className="text-sm text-slate-500">No bets placed in this round.</p>}
                      </div>
                    </section>
                  </aside>
                </div>
              </>
            )}
          </section>
        </div>
        <p aria-live="polite" className="mt-5 min-h-6 text-sm text-emerald-200">{message}</p>
        <p aria-live="polite" className="mt-1 min-h-6 text-sm text-amber-200">{error}</p>
      </div>
    </main>
  );
}
