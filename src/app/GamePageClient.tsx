"use client";

import { useEffect, useState } from "react";
import {useRouter } from "next/navigation";
import Dice from "@/components/Dice";

type BetType = "UP" | "SEVEN" | "DOWN";

type Round = {
  id: string;
  dice1: number;
  dice2: number;
  total: number;
  result: BetType;
  bet: BetType;
  amount: number;
  won: boolean;
  profit: number;
  createdAt: string;
};

export default function Home() {
  const router = useRouter();
  const [dice1, setDice1] = useState(1);
  const [dice2, setDice2] = useState(1);

  const [balance, setBalance] = useState(0);

  const [betAmount, setBetAmount] = useState(0);

  const [selectedBet, setSelectedBet] =
    useState<BetType | null>(null);

  const [total, setTotal] = useState<number | null>(null);

  const [result, setResult] =
    useState<BetType | null>(null);

  const [message, setMessage] = useState(
    "Choose your prediction and place your bet"
  );

  const [rolling, setRolling] = useState(false);

  const [rounds, setRounds] = useState<Round[]>([]);

  const [roundNumber, setRoundNumber] = useState(1);
  const [betPlaced, setBetPlaced] = useState(false);
  const [currentBet, setCurrentBet] = useState(0);
  const [lastProfit, setLastProfit] = useState(0);

  //logout function
  async function handleLogout() {
  try {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Logout failed.");
    }

    router.push("/login");
    router.refresh();
  } catch (error) {
    console.error("Logout error:", error);
  }
}

  useEffect(() => {
  async function loadBalance() {
    try {
      const response = await fetch("/api/game");
      const data = await response.json();

      if (response.ok && data.success) {
        setBalance(Number(data.balance));
      }
    } catch (error) {
      console.error("Could not load balance:", error);
    }
  }

  loadBalance();
}, []);

  useEffect(() => {
  async function loadHistory() {
    try {
      const response = await fetch("/api/game/history");
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Could not load game history.");
      }

      const savedRounds: Round[] = data.history.map(
        (round: {
          id: string;
          dice1: number;
          dice2: number;
          total: number;
          result: BetType;
          bet: BetType;
          amount: string;
          won: boolean;
          profit: string;
          createdAt: string;
        }) => ({
          id: round.id,
          dice1: round.dice1,
          dice2: round.dice2,
          total: round.total,
          result: round.result,
          bet: round.bet,
          amount: Number(round.amount),
          won: round.won,
          profit: Number(round.profit),
          createdAt: round.createdAt,
        })
      );

      setRounds(savedRounds);
    } catch (error) {
      console.error("Could not load game history:", error);
    }
  }

  loadHistory();
}, []);


  // ----------------------------------------
  // DICE FACE
  // ----------------------------------------

  // ----------------------------------------
  // ROLL DICE
  // ----------------------------------------
  function getPayoutMultiplier(bet: BetType) {
  if (bet === "SEVEN") {
    return 5;
  }

  return 1;
}
  function placeBet() {
  if (rolling) {
    return;
  }

  if (!selectedBet) {
    setMessage("⚠️ Please select your prediction first.");
    return;
  }

  if (!Number.isFinite(betAmount) || betAmount <= 0) {
    setMessage("⚠️ Please enter a valid bet amount.");
    return;
  }

  if (!Number.isInteger(betAmount)) {
    setMessage("⚠️ Bet amount must be a whole number.");
    return;
  }

  if (betAmount > balance) {
    setMessage("⚠️ Insufficient virtual balance.");
    return;
  }

  // The server will deduct the balance when the dice are rolled.
  setCurrentBet(betAmount);
  setBetPlaced(true);
  setLastProfit(0);

  setMessage(
    `✓ Bet placed: ${
      selectedBet === "SEVEN"
        ? "EXACT 7"
        : selectedBet === "UP"
        ? "7 UP"
        : "7 DOWN"
    } — ₹${betAmount.toLocaleString()}`
  );
}

  async function rollDice() {
  if (rolling) {
    return;
  }

  if (!betPlaced || currentBet <= 0 || !selectedBet) {
    setMessage("⚠️ Place your bet before rolling.");
    return;
  }

  setRolling(true);
  setMessage("🎲 Rolling the dice...");
  setResult(null);
  setTotal(null);
  setLastProfit(0);

  // Visual animation only.
  // The final dice result comes securely from the server.
  const animationTime = 1200;

  const animationInterval = setInterval(() => {
    setDice1(Math.floor(Math.random() * 6) + 1);
    setDice2(Math.floor(Math.random() * 6) + 1);
  }, 100);

  try {
    // Keep the existing rolling animation visible.
    await new Promise((resolve) =>
      setTimeout(resolve, animationTime)
    );

    clearInterval(animationInterval);

    // Send the actual bet to the server.
    const response = await fetch("/api/game", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        betType: selectedBet,
        amount: currentBet,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.message || "Game could not be completed."
      );
    }

    // The server is the source of truth.
    const serverDice1 = data.round.dice1;
    const serverDice2 = data.round.dice2;
    const serverTotal = data.round.total;
    const serverResult = data.round.result;

    setDice1(serverDice1);
    setDice2(serverDice2);
    setTotal(serverTotal);
    setResult(serverResult);

    // Update the real balance returned by the server.
    setBalance(Number(data.balance));

    const won = data.bet.won;
    const profit = Number(data.bet.profit);

    setLastProfit(profit);

    if (won) {
      setMessage(
        `🎉 You won ₹${Math.abs(profit).toLocaleString()} profit!`
      );
    } else {
      setMessage(
        `😔 You lost ₹${currentBet.toLocaleString()}.`
      );
    }

    // Refresh history from the database after a successful round.
const historyResponse = await fetch("/api/game/history");
const historyData = await historyResponse.json();

if (historyResponse.ok && historyData.success) {
  const savedRounds: Round[] = historyData.history.map(
    (round: {
      id: string;
      dice1: number;
      dice2: number;
      total: number;
      result: BetType;
      bet: BetType;
      amount: string;
      won: boolean;
      profit: string;
      createdAt: string;
    }) => ({
      id: round.id,
      dice1: round.dice1,
      dice2: round.dice2,
      total: round.total,
      result: round.result,
      bet: round.bet,
      amount: Number(round.amount),
      won: round.won,
      profit: Number(round.profit),
      createdAt: round.createdAt,
    })
  );

  setRounds(savedRounds);
}

    setRoundNumber((current) => current + 1);

    // Reset the current bet.
    setBetPlaced(false);
    setCurrentBet(0);
  } catch (error) {
    clearInterval(animationInterval);

    console.error("Game error:", error);

    setMessage(
      error instanceof Error
        ? `⚠️ ${error.message}`
        : "⚠️ Game could not be completed."
    );
  } finally {
    setRolling(false);
  }
}

  return (

    <main className="min-h-screen overflow-x-hidden bg-[#070b14] px-3 py-4 text-white sm:px-4 sm:py-8">

      <div className="mx-auto max-w-6xl">


        {/* ================================= */}
        {/* HEADER */}
        {/* ================================= */}

        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-center sm:text-left">
            <h1 className="text-2xl font-black sm:text-2xl">
              7UP{" "}
              <span className="text-cyan-400">7</span>{" "}
              DOWN
            </h1>
            <p className="text-xs text-slate-400">Virtual Dice Game</p>
          </div>

          <nav aria-label="Account navigation" className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
            <a
              href="/profile"
              className="rounded-full border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-300 transition hover:border-cyan-400 hover:text-cyan-400 sm:px-4"
            >
              Profile
            </a>
            <a
              href="/dashboard"
              className="rounded-full border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white sm:px-4"
            >
              Dashboard
            </a>
            <div className="flex items-center rounded-full border border-slate-700 bg-slate-900 px-4 py-2">
              <span className="text-sm text-slate-400">Balance</span>
              <span className="ml-2 font-bold text-cyan-400">₹{balance.toLocaleString()}</span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-full border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-500/20 sm:px-4"
            >
              Logout
            </button>
          </nav>
        </header>


        {/* ================================= */}
        {/* ROUND */}
        {/* ================================= */}

        <div className="mt-6 text-center sm:mt-8">

          <span className="rounded-full bg-slate-900 px-4 py-2 text-xs text-slate-400">

            ROUND #{roundNumber}

          </span>

        </div>


        {/* ================================= */}
        {/* GAME CARD */}
        {/* ================================= */}

        <section className="mx-auto mt-5 max-w-5xl rounded-3xl border border-slate-800 bg-[#0d1422] p-4 shadow-2xl sm:mt-6 sm:p-6 md:p-10">


          {/* TITLE */}

          <div className="text-center">

            <p className="text-xs uppercase tracking-[0.2em] text-slate-500 sm:text-sm sm:tracking-[0.3em]">

              Predict the total

            </p>

            <h2 className="mt-2 text-3xl font-black sm:text-4xl md:text-5xl">

              7 Up 7 Down

            </h2>

          </div>


          {/* ================================= */}
          {/* DICE */}
          {/* ================================= */}

          <div className="mt-8 flex justify-center gap-3 sm:mt-12 sm:gap-5 md:gap-8">

  <Dice
    value={dice1}
    rolling={rolling}
  />

  <Dice
    value={dice2}
    rolling={rolling}
  />

</div>


          {/* ================================= */}
          {/* TOTAL */}
          {/* ================================= */}

          <div className="mt-6 text-center sm:mt-8">

            <p className="text-sm text-slate-500">
              TOTAL
            </p>


            <p className="mt-1 text-5xl font-black sm:text-6xl">

              {total ?? "--"}

            </p>


            {result && (

              <p className="mt-2 text-lg font-bold text-cyan-400">

                {result === "UP" &&
                  "7 UP"}

                {result === "SEVEN" &&
                  "EXACT 7"}

                {result === "DOWN" &&
                  "7 DOWN"}

              </p>

            )}

          </div>


          {/* ================================= */}
          {/* BET OPTIONS */}
          {/* ================================= */}

          <div className="mt-8 sm:mt-10">

            <p className="mb-4 text-center text-sm font-semibold text-slate-400">

              MAKE YOUR PREDICTION

            </p>


            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">


              {/* DOWN */}

              <button
                type="button"
                disabled={rolling}
                onClick={() =>
                  setSelectedBet("DOWN")
                }
                className={`rounded-2xl border p-4 text-center transition sm:p-6 ${
                  selectedBet === "DOWN"
                    ? "border-cyan-400 bg-cyan-400/10"
                    : "border-slate-700 bg-slate-900 hover:border-slate-500"
                } ${
                  rolling
                    ? "cursor-not-allowed opacity-50"
                    : ""
                }`}
              >

                <div className="text-xl font-black sm:text-2xl">
                  7 DOWN
                </div>

                <div className="mt-2 text-sm text-slate-400">
                  Total 2 – 6
                </div>

              </button>


              {/* SEVEN */}

              <button
                type="button"
                disabled={rolling}
                onClick={() =>
                  setSelectedBet("SEVEN")
                }
                className={`rounded-2xl border p-4 text-center transition sm:p-6 ${
                  selectedBet === "SEVEN"
                    ? "border-yellow-400 bg-yellow-400/10"
                    : "border-slate-700 bg-slate-900 hover:border-slate-500"
                } ${
                  rolling
                    ? "cursor-not-allowed opacity-50"
                    : ""
                }`}
              >

                <div className="text-xl font-black sm:text-2xl">
                  EXACT 7
                </div>

                <div className="mt-2 text-sm text-slate-400">
                  Total exactly 7
                </div>

              </button>


              {/* UP */}

              <button
                type="button"
                disabled={rolling}
                onClick={() =>
                  setSelectedBet("UP")
                }
                className={`rounded-2xl border p-4 text-center transition sm:p-6 ${
                  selectedBet === "UP"
                    ? "border-green-400 bg-green-400/10"
                    : "border-slate-700 bg-slate-900 hover:border-slate-500"
                } ${
                  rolling
                    ? "cursor-not-allowed opacity-50"
                    : ""
                }`}
              >

                <div className="text-xl font-black sm:text-2xl">
                  7 UP
                </div>

                <div className="mt-2 text-sm text-slate-400">
                  Total 8 – 12
                </div>

              </button>


            </div>

          </div>


          {/* ================================= */}
          {/* BET AMOUNT */}
          {/* ================================= */}

          <div className="mx-auto mt-7 max-w-md sm:mt-8">

            <label
              htmlFor="bet"
              className="mb-2 block text-sm font-medium text-slate-400"
            >

              Bet Amount

            </label>


            <input
              id="bet"
              type="number"
              min="1"
              max={balance}
              disabled={rolling}
              value={betAmount}
              onChange={(event) =>
                setBetAmount(
                  Number(event.target.value)
                )
              }
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-400 disabled:opacity-50"
            />


            {/* QUICK BETS */}

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">

              {[100, 500, 1000, 5000].map(
                (amount) => (

                  <button
                    key={amount}
                    type="button"
                    disabled={
                      rolling ||
                      amount > balance
                    }
                    onClick={() =>
                      setBetAmount(amount)
                    }
                    className="rounded-lg bg-slate-800 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-700 disabled:opacity-40"
                  >

                    ₹{amount}

                  </button>

                )
              )}

            </div>

          </div>


          {/* ================================= */}
          {/* MESSAGE */}
          {/* ================================= */}

          <div
            className="mt-6 break-words text-center text-sm text-slate-400 sm:mt-8"
            aria-live="polite"
          >

            {message}

          </div>
          
          {/* ================================= */}
          {/* CURRENT BET */}
          {/* ================================= */}

          {betPlaced && !rolling && (
  <div className="mx-auto mt-5 max-w-md text-center">

    <p className="text-xs uppercase tracking-wider text-slate-500">
      Current Bet
    </p>

    <p className="mt-1 text-xl font-black text-cyan-400">
      ₹{currentBet.toLocaleString()}
    </p>

    <p className="mt-1 text-sm text-slate-400">
      Potential Profit: ₹
      {(currentBet * getPayoutMultiplier(selectedBet!)).toLocaleString()}
    </p>

  </div>
)}


          {/* ================================= */}
          {/* ROLL BUTTON */}
          {/* ================================= */}

          <div className="mt-6 flex flex-col items-center gap-3">

  {!betPlaced && (

    <button
      type="button"
      disabled={rolling}
      onClick={placeBet}
      className="w-full max-w-md rounded-2xl bg-white px-12 py-4 text-lg font-black text-slate-950 shadow-lg transition hover:bg-slate-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
    >
      ✓ PLACE BET
    </button>

  )}

  {betPlaced && (

    <div className="w-full max-w-md rounded-xl border border-green-500/30 bg-green-500/10 px-5 py-3 text-center">

      <p className="text-sm font-semibold text-green-400">
        ✓ BET PLACED
      </p>

      <p className="mt-1 text-sm text-slate-300">
        {selectedBet === "UP"
          ? "7 UP"
          : selectedBet === "DOWN"
            ? "7 DOWN"
            : "EXACT 7"}

        {" • "}

        ₹{currentBet.toLocaleString()}
      </p>

    </div>

  )}

  <button
    type="button"
    disabled={rolling || !betPlaced}
    onClick={rollDice}
    className="w-full max-w-md rounded-2xl bg-cyan-400 px-12 py-4 text-lg font-black text-slate-950 shadow-lg transition hover:bg-cyan-300 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
  >
    {rolling
      ? "🎲 ROLLING..."
      : "🎲 ROLL DICE"}
  </button>

</div>

        </section>


        {/* ================================= */}
        {/* HISTORY */}
        {/* ================================= */}

        <section className="mt-5 rounded-2xl border border-slate-800 bg-[#0d1422] p-3 sm:mt-6 sm:p-6">

          <div className="flex items-center justify-between">

            <h3 className="font-bold">
              Recent Rounds
            </h3>

            <span className="text-xs text-slate-500">
              Last 10
            </span>

          </div>


          {rounds.length === 0 ? (

            <p className="mt-6 text-center text-sm text-slate-500">

              No rounds played yet.

            </p>

          ) : (

            <div className="mt-5 overflow-x-auto">

              <table className="w-full min-w-[600px] text-left text-sm">

                <thead className="border-b border-slate-800 text-slate-500">

                  <tr>

                    <th className="px-3 py-3">
                      Round
                    </th>

                    <th className="px-3 py-3">
                      Dice
                    </th>

                    <th className="px-3 py-3">
                      Total
                    </th>

                    <th className="px-3 py-3">
                      Bet
                    </th>

                    <th className="px-3 py-3">
                      Amount
                    </th>

                    <th className="px-3 py-3">
                      Result
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {rounds.map(
                    (round) => (

                      <tr
                        key={round.id}
                        className="border-b border-slate-800/60"
                      >

                        <td className="px-3 py-3">
                          #{round.id}
                        </td>

                        <td className="px-3 py-3">
                          {round.dice1} + {round.dice2}
                        </td>

                        <td className="px-3 py-3 font-bold">
                          {round.total}
                        </td>

                        <td className="px-3 py-3">
                          {round.bet}
                        </td>

                        <td className="px-3 py-3">
                          ₹{round.amount}
                        </td>

                        <td
                          className={`px-3 py-3 font-bold ${
                            round.won
                              ? "text-green-400"
                              : "text-red-400"
                          }`}
                        >

                          {round.won
                            ? `+₹${round.profit}`
                            : `-₹${Math.abs(
                                round.profit
                              )}`}

                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          )}

        </section>


      </div>

    </main>

  );
}