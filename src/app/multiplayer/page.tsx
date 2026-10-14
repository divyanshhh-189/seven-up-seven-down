"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function MultiplayerPage() {
  const router = useRouter();
  const [name, setName] = useState("Lucky Table");
  const [maxPlayers, setMaxPlayers] = useState(6);
  const [roundSeconds, setRoundSeconds] = useState(30);
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function createRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, maxPlayers, roundSeconds }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Could not create room.");
      router.push(`/rooms/${data.code}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create room.");
    } finally {
      setBusy(false);
    }
  }

  function joinRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!code) {
      setMessage("Enter your friend's six-character room code.");
      return;
    }
    router.push(`/rooms/${encodeURIComponent(code)}`);
  }

  return (
    <main className="min-h-screen bg-[#070b14] px-4 py-8 text-white sm:py-14">
      <div className="mx-auto max-w-5xl">
        <a href="/" className="text-sm font-semibold text-cyan-300 hover:text-cyan-200">← Back to game</a>
        <header className="mt-8 max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-300">Private multiplayer</p>
          <h1 className="mt-3 text-4xl font-black sm:text-5xl">Roll together.</h1>
          <p className="mt-3 text-slate-400">Create a private table and share its code, or join a friend’s room.</p>
        </header>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <section className="rounded-3xl border border-cyan-300/20 bg-[#0d1422] p-6 shadow-xl sm:p-8">
            <div className="mb-6 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400/10 text-xl">🎲</span>
              <div>
                <h2 className="text-xl font-extrabold">Host a room</h2>
                <p className="text-sm text-slate-400">Set the table before you invite players.</p>
              </div>
            </div>
            <form onSubmit={createRoom} className="space-y-4">
              <label className="block text-sm font-semibold text-slate-300">
                Room name
                <input value={name} maxLength={40} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-[#080e19] px-4 py-3 text-white outline-none focus:border-cyan-400" />
              </label>
              <label className="block text-sm font-semibold text-slate-300">
                Maximum players
                <select value={maxPlayers} onChange={(event) => setMaxPlayers(Number(event.target.value))} className="mt-2 w-full rounded-xl border border-slate-700 bg-[#080e19] px-4 py-3 text-white outline-none focus:border-cyan-400">
                  {[2, 4, 6, 8, 10, 12].map((count) => <option key={count} value={count}>{count} players</option>)}
                </select>
              </label>
              <label className="block text-sm font-semibold text-slate-300">
                Betting time per round
                <select value={roundSeconds} onChange={(event) => setRoundSeconds(Number(event.target.value))} className="mt-2 w-full rounded-xl border border-slate-700 bg-[#080e19] px-4 py-3 text-white outline-none focus:border-cyan-400">
                  {[15, 20, 30, 45, 60, 90, 120].map((seconds) => <option key={seconds} value={seconds}>{seconds} seconds</option>)}
                </select>
              </label>
              <button disabled={busy} className="w-full rounded-xl bg-cyan-400 px-5 py-3.5 font-extrabold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50">
                {busy ? "Creating room…" : "Create room"}
              </button>
            </form>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-[#0d1422] p-6 shadow-xl sm:p-8">
            <div className="mb-6 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-400/10 text-xl">🔑</span>
              <div>
                <h2 className="text-xl font-extrabold">Join a room</h2>
                <p className="text-sm text-slate-400">Ask the host for their room code.</p>
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
              <button className="w-full rounded-xl border border-cyan-300/40 bg-cyan-400/10 px-5 py-3.5 font-extrabold text-cyan-200 transition hover:bg-cyan-400/20">
                Find room
              </button>
            </form>
            <div className="mt-7 rounded-2xl border border-slate-800 bg-[#080e19] p-4 text-sm leading-6 text-slate-400">
              Each player uses their own account and virtual wallet. The host controls the round timer, table size, and when the next round begins.
            </div>
          </section>
        </div>
        <p aria-live="polite" className="mt-5 min-h-6 text-sm text-amber-200">{message}</p>
      </div>
    </main>
  );
}
