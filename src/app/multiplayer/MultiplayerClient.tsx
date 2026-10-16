"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function MultiplayerClient({ isManager }: { isManager: boolean }) {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");
  const [message, setMessage] = useState("");
  const [roomName, setRoomName] = useState("Friends Table");
  const [maxPlayers, setMaxPlayers] = useState(6);
  const [roundSeconds, setRoundSeconds] = useState(30);
  const [minBet, setMinBet] = useState(1);
  const [maxBet, setMaxBet] = useState(10000);
  const [creating, setCreating] = useState(false);

  async function createRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setMessage("");
    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: roomName, maxPlayers, roundSeconds, minBet, maxBet }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Could not create your room.");
      router.push("/rooms/" + encodeURIComponent(data.code));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create your room.");
    } finally {
      setCreating(false);
    }
  }

  function joinRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 6) {
      setMessage("Enter the six-character table code shared with you.");
      return;
    }
    router.push("/rooms/" + encodeURIComponent(code));
  }

  return (
    <main className="min-h-screen bg-[#070b14] px-4 py-8 text-white sm:py-14">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm font-semibold text-cyan-300 hover:text-cyan-200">← Back to game</Link>
        <header className="mt-8">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-300">Multiplayer</p>
          <h1 className="mt-3 text-4xl font-black sm:text-5xl">Roll together.</h1>
          <p className="mt-3 text-slate-400">Create a room for friends or join a table with its six-character code.</p>
        </header>

        <section className="mt-8 rounded-3xl border border-cyan-300/20 bg-[#0d1422] p-6 shadow-xl sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400/10 text-xl">🎲</span>
            <div>
              <h2 className="text-xl font-extrabold">Create a room</h2>
              <p className="text-sm text-slate-400">You’ll host this room. Share its code so friends can join.</p>
            </div>
          </div>
          <form onSubmit={createRoom} className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-slate-300 sm:col-span-2">Room name
              <input value={roomName} maxLength={40} onChange={(event) => setRoomName(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-[#080e19] px-4 py-3 text-white outline-none focus:border-cyan-400" />
            </label>
            <label className="block text-sm font-semibold text-slate-300">Player limit
              <select value={maxPlayers} onChange={(event) => setMaxPlayers(Number(event.target.value))} className="mt-2 w-full rounded-xl border border-slate-700 bg-[#080e19] px-4 py-3 text-white outline-none focus:border-cyan-400">
                {[2, 4, 6, 8, 10, 12].map((count) => <option key={count} value={count}>{count} players</option>)}
              </select>
            </label>
            <label className="block text-sm font-semibold text-slate-300">Betting timer
              <select value={roundSeconds} onChange={(event) => setRoundSeconds(Number(event.target.value))} className="mt-2 w-full rounded-xl border border-slate-700 bg-[#080e19] px-4 py-3 text-white outline-none focus:border-cyan-400">
                {[15, 20, 30, 45, 60, 90, 120].map((seconds) => <option key={seconds} value={seconds}>{seconds} seconds</option>)}
              </select>
            </label>
            <label className="block text-sm font-semibold text-slate-300">Minimum bet
              <input type="number" min={1} step={1} value={minBet} onChange={(event) => setMinBet(Number(event.target.value))} className="mt-2 w-full rounded-xl border border-slate-700 bg-[#080e19] px-4 py-3 text-white outline-none focus:border-cyan-400" />
            </label>
            <label className="block text-sm font-semibold text-slate-300">Maximum bet
              <input type="number" min={minBet} step={1} value={maxBet} onChange={(event) => setMaxBet(Number(event.target.value))} className="mt-2 w-full rounded-xl border border-slate-700 bg-[#080e19] px-4 py-3 text-white outline-none focus:border-cyan-400" />
            </label>
            <button disabled={creating} className="rounded-xl bg-cyan-400 px-5 py-3.5 font-extrabold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50 sm:col-span-2">{creating ? "Creating room…" : "Create room"}</button>
          </form>
        </section>

        <section className="mt-5 rounded-3xl border border-cyan-300/20 bg-[#0d1422] p-6 shadow-xl sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-400/10 text-xl">🔑</span>
            <div>
              <h2 className="text-xl font-extrabold">Join a table</h2>
              <p className="text-sm text-slate-400">Join with your account and play using your virtual wallet.</p>
            </div>
          </div>
          <form onSubmit={joinRoom} className="space-y-4">
            <label className="block text-sm font-semibold text-slate-300">
              Six-character join code
              <input
                value={joinCode}
                maxLength={6}
                autoComplete="off"
                onChange={(event) => setJoinCode(event.target.value.replace(/[^a-z0-9]/gi, "").toUpperCase())}
                placeholder="E.G. 7KQ4MX"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-[#080e19] px-4 py-3 text-center font-mono text-xl font-bold tracking-[0.28em] text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"
              />
            </label>
            <button className="w-full rounded-xl bg-cyan-400 px-5 py-3.5 font-extrabold text-slate-950 transition hover:bg-cyan-300">
              Find table
            </button>
          </form>
          <p aria-live="polite" className="mt-4 min-h-6 text-sm text-amber-200">{message}</p>
        </section>

        {isManager && (
          <a href="/manager" className="mt-5 block rounded-2xl border border-cyan-300/20 bg-cyan-400/5 p-4 text-center text-sm font-bold text-cyan-100 hover:bg-cyan-400/10">
            Open your private table manager space →
          </a>
        )}
      </div>
    </main>
  );
}
