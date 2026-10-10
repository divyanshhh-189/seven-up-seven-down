"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  BarChart,
  Bar,
} from "recharts";

type BetRecord = {
  id: string;
  dice1: number;
  dice2: number;
  total: number;
  result: "UP" | "SEVEN" | "DOWN";
  bet: "UP" | "SEVEN" | "DOWN";
  amount: number;
  won: boolean;
  profit: number;
  createdAt: string;
};

type Stats = {
  totalBets: number;
  totalWins: number;
  totalLosses: number;
  winRate: number;
  netProfitLoss: number;
  balance: string;
};

export default function DashboardPage() {
  const router = useRouter();

  const [stats, setStats] = useState<Stats | null>(null);
  const [records, setRecords] = useState<BetRecord[]>([]);
  const [dateFilter, setDateFilter] = useState<
  "7days" | "30days" | "all"
  >("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        const [statsResponse, analyticsResponse] = await Promise.all([
          fetch("/api/game/stats"),
          fetch("/api/game/analytics"),
        ]);

        if (statsResponse.status === 401 || analyticsResponse.status === 401) {
          router.replace("/login");
          return;
        }

        const statsData = await statsResponse.json();
        const analyticsData = await analyticsResponse.json();

        if (!statsResponse.ok || !statsData.success) {
          throw new Error(
            statsData.message || "Could not load statistics."
          );
        }

        if (!analyticsResponse.ok || !analyticsData.success) {
          throw new Error(
            analyticsData.message || "Could not load analytics."
          );
        }

        if (!cancelled) {
          setStats(statsData.stats);
          setRecords(analyticsData.analytics);
        }
      } catch (err) {
        console.error("Dashboard loading error:", err);

        if (!cancelled) {
          setError("Could not load dashboard data. Please try again.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const money = (amount: number) =>
    `${amount < 0 ? "-₹" : "₹"}${Math.abs(amount).toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    })}`;

    const filteredRecords = useMemo(() => {
  if (dateFilter === "all") {
    return records;
  }

  const now = new Date();

  const startDate = new Date(now);
  startDate.setHours(0, 0, 0, 0);

  if (dateFilter === "7days") {
    startDate.setDate(startDate.getDate() - 6);
  } else {
    startDate.setDate(startDate.getDate() - 29);
  }

  return records.filter(
    (record) => new Date(record.createdAt) >= startDate
  );
}, [records, dateFilter]);

  const chartData = useMemo(() => {
    let cumulativeProfit = 0;

    return [...filteredRecords]
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map((record, index) => {
      cumulativeProfit += record.profit;

      return {
        round: index + 1,
        profit: record.profit,
        cumulativeProfit,
        date: new Date(record.createdAt).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
        }),
      };
    });
  }, [filteredRecords]);

  const betTypeData = useMemo(() => {
    const types = ["UP", "SEVEN", "DOWN"] as const;

    return types.map((type) => {
      const typeRecords = filteredRecords.filter((record) => record.bet === type);

      return {
        type,
        bets: typeRecords.length,
        wins: typeRecords.filter((record) => record.won).length,
        losses: typeRecords.filter((record) => !record.won).length,
        profit: typeRecords.reduce((sum, record) => sum + record.profit, 0),
      };
    });
  }, [filteredRecords]);

  const performanceInsights = useMemo(() => {
  const totalBets = filteredRecords.length;

  const totalAmountWagered = filteredRecords.reduce(
    (sum, record) => sum + record.amount,
    0
  );

  const averageStake =
    totalBets > 0 ? totalAmountWagered / totalBets : 0;

  const winningRecords = filteredRecords.filter(
    (record) => record.won
  );

  const losingRecords = filteredRecords.filter(
    (record) => !record.won
  );

  const largestWinningBet =
    winningRecords.length > 0
      ? Math.max(...winningRecords.map((record) => record.profit))
      : 0;

  const largestLosingBet =
    losingRecords.length > 0
      ? Math.min(...losingRecords.map((record) => record.profit))
      : 0;

  const bestWinRate = [...betTypeData]
    .filter((item) => item.bets > 0)
    .map((item) => ({
      type: item.type,
      winRate: (item.wins / item.bets) * 100,
      bets: item.bets,
    }))
    .sort((a, b) => b.winRate - a.winRate)[0] ?? null;

  return {
    averageStake,
    totalAmountWagered,
    largestWinningBet,
    largestLosingBet,
    bestWinRate,
  };
}, [filteredRecords, betTypeData]);

  const filteredWins = filteredRecords.filter(
  (record) => record.won
).length;

const filteredLosses = filteredRecords.filter(
  (record) => !record.won
).length;

const filteredWinRate =
  filteredRecords.length > 0
    ? Number(
        ((filteredWins / filteredRecords.length) * 100).toFixed(2)
      )
    : 0;

const filteredProfitLoss = filteredRecords.reduce(
  (sum, record) => sum + record.profit,
  0
);

const filteredStats = {
  totalBets: filteredRecords.length,
  totalWins: filteredWins,
  totalLosses: filteredLosses,
  winRate: filteredWinRate,
  netProfitLoss: filteredProfitLoss,
};

const winLossData = [
  { name: "Wins", value: filteredWins },
  { name: "Losses", value: filteredLosses },
];

  const recentRecords = [...filteredRecords]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070b14] text-cyan-400">
        Loading your analytics dashboard...
      </main>
    );
  }

  if (error || !stats) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#070b14] px-4 text-white">
        <p className="text-red-400">
          {error || "Dashboard data is unavailable."}
        </p>

        <button
          onClick={() => window.location.reload()}
          className="rounded-xl bg-cyan-400 px-5 py-3 font-bold text-slate-950"
        >
          Try Again
        </button>

        <button
          onClick={() => router.push("/")}
          className="text-cyan-400 hover:underline"
        >
          Back to Game
        </button>
      </main>
    );
  }

  const cards = [
    {
      title: "Total Bets",
      value: filteredStats.totalBets.toLocaleString("en-IN"),
      color: "text-white",
    },
    {
      title: "Wins",
      value: filteredStats.totalWins.toLocaleString("en-IN"),
      color: "text-emerald-400",
    },
    {
      title: "Losses",
      value: filteredStats.totalLosses.toLocaleString("en-IN"),
      color: "text-red-400",
    },
    {
      title: "Win Rate",
      value: `${filteredStats.winRate}%`,
      color: "text-cyan-400",
    },
    {
      title: "Net Profit / Loss",
      value: money(filteredStats.netProfitLoss),
      color:
        filteredStats.netProfitLoss >= 0
          ? "text-emerald-400"
          : "text-red-400",
    },
    {
      title: "Wallet Balance",
      value: money(Number(stats.balance)),
      color: "text-cyan-400",
    },
  ];

  return (
    <main className="min-h-screen bg-[#070b14] px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-400">
              Player Analytics
            </p>

            <h1 className="mt-2 text-3xl font-black sm:text-4xl">
              Performance <span className="text-cyan-400">Dashboard</span>
            </h1>

            <p className="mt-2 text-slate-400">
              Insights calculated from your recorded virtual bets and selected period.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => router.push("/")}
              className="rounded-xl border border-slate-700 px-5 py-3 font-semibold transition hover:border-cyan-400"
            >
              Play Game
            </button>

            <button
              onClick={() => router.push("/profile")}
              className="rounded-xl bg-cyan-400 px-5 py-3 font-bold text-slate-950 transition hover:bg-cyan-300"
            >
              My Profile
            </button>
          </div>
        </header>

        {/* Wallet banner */}
        <section className="mb-8 rounded-3xl border border-cyan-400/20 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 p-6 sm:p-8">
          <p className="text-sm text-slate-400">Current Virtual Balance</p>

          <p className="mt-2 text-4xl font-black text-cyan-400 sm:text-5xl">
            {money(Number(stats.balance))}
          </p>

          <p className="mt-3 text-sm text-slate-400">
            Your current wallet balance from your account.
          </p>
        </section>

        {/* Date Filters */}
        <section className="mb-8 rounded-2xl border border-slate-800 bg-[#0d1422] p-5">
          <div className="mb-4">
            <h2 className="text-lg font-bold">Analytics Period</h2>
            <p className="mt-1 text-sm text-slate-400">
              Choose the period for your betting statistics and charts.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {[
              { label: "Last 7 Days", value: "7days" },
              { label: "Last 30 Days", value: "30days" },
              { label: "All Time", value: "all" },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() =>
                  setDateFilter(option.value as "7days" | "30days" | "all")
                }
                aria-pressed={dateFilter === option.value}
                className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                  dateFilter === option.value
                    ? "border-cyan-400 bg-cyan-400 text-slate-950"
                    : "border-slate-700 text-slate-300 hover:border-cyan-400"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>

        {/* Summary cards */}
        <section className="mb-10">
          <h2 className="mb-5 text-xl font-bold">Performance Overview</h2>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((card) => (
              <article
                key={card.title}
                className="rounded-2xl border border-slate-800 bg-[#0d1422] p-6 transition hover:border-cyan-400/40"
              >
                <p className="text-sm text-slate-400">{card.title}</p>

                <p className={`mt-4 break-words text-3xl font-black ${card.color}`}>
                  {card.value}
                </p>
              </article>
            ))}
          </div>
        </section>
        
          {/* Performance Insights */}
<section className="mb-10">
  <div className="mb-5">
    <h2 className="text-lg font-bold">
      Performance Insights
    </h2>

    <p className="mt-1 text-sm text-slate-400">
      A deeper look at your recorded betting activity.
    </p>
  </div>

  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
    <article className="rounded-xl border border-slate-800 bg-[#0d1422] p-5">
      <p className="text-sm text-slate-400">
        Average Stake
      </p>

      <p className="mt-3 text-xl font-bold text-cyan-400">
        {money(performanceInsights.averageStake)}
      </p>

      <p className="mt-2 text-xs text-slate-500">
        Average amount per recorded bet
      </p>
    </article>

    <article className="rounded-xl border border-slate-800 bg-[#0d1422] p-5">
      <p className="text-sm text-slate-400">
        Total Amount Wagered
      </p>

      <p className="mt-3 text-xl font-bold text-white">
        {money(performanceInsights.totalAmountWagered)}
      </p>

      <p className="mt-2 text-xs text-slate-500">
        Sum of recorded bet amounts
      </p>
    </article>

    <article className="rounded-xl border border-slate-800 bg-[#0d1422] p-5">
      <p className="text-sm text-slate-400">
        Largest Winning Bet
      </p>

      <p className="mt-3 text-xl font-bold text-emerald-400">
        {money(performanceInsights.largestWinningBet)}
      </p>

      <p className="mt-2 text-xs text-slate-500">
        Highest profit on one bet
      </p>
    </article>

    <article className="rounded-xl border border-slate-800 bg-[#0d1422] p-5">
      <p className="text-sm text-slate-400">
        Largest Losing Bet
      </p>

      <p className="mt-3 text-xl font-bold text-rose-400">
        {money(performanceInsights.largestLosingBet)}
      </p>

      <p className="mt-2 text-xs text-slate-500">
        Worst profit/loss on one bet
      </p>
    </article>

    <article className="rounded-xl border border-slate-800 bg-[#0d1422] p-5 sm:col-span-2 xl:col-span-2">
      <p className="text-sm text-slate-400">
        Best Historical Win Rate by Bet Type
      </p>

      {performanceInsights.bestWinRate ? (
        <>
          <div className="mt-3 flex flex-wrap items-baseline gap-3">
            <span className="text-xl font-bold text-cyan-400">
              {performanceInsights.bestWinRate.type}
            </span>

            <span className="text-xl font-bold text-white">
              {performanceInsights.bestWinRate.winRate.toFixed(2)}%
            </span>
          </div>

          <p className="mt-2 text-xs text-slate-500">
            Based on {performanceInsights.bestWinRate.bets} recorded bets
            of this type.
          </p>
        </>
      ) : (
        <p className="mt-3 text-sm text-slate-500">
          No recorded bets available yet.
        </p>
      )}
    </article>
  </div>
</section>  

        {/* Charts */}
        <section className="mb-10">
          <h2 className="mb-5 text-xl font-bold">Analytical Insights</h2>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">

            {/* Win/Loss donut */}
            <article className="rounded-2xl border border-slate-800 bg-[#0d1422] p-5 sm:p-6">
              <h3 className="text-lg font-bold">Win vs. Loss Distribution</h3>

              <p className="mt-1 text-sm text-slate-400">
                Proportion of recorded winning and losing bets.
              </p>

              {filteredStats.totalBets === 0 ? (
                <p className="py-20 text-center text-slate-500">
                  No bets recorded yet.
                </p>
              ) : (
                <div className="mt-4 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={winLossData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={65}
                        outerRadius={95}
                        paddingAngle={4}
                      >
                        {winLossData.map((entry) => (
                          <Cell
                            key={entry.name}
                            fill={entry.name === "Wins" ? "#10b981" : "#fb7185"}
                          />
                        ))}
                      </Pie>

                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0d1422",
                          border: "1px solid #334155",
                          borderRadius: 12,
                          color: "#fff",
                        }}
                      />

                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </article>

            {/* Cumulative P/L */}
            <article className="rounded-2xl border border-slate-800 bg-[#0d1422] p-5 sm:p-6">
              <h3 className="text-lg font-bold">Cumulative Profit / Loss</h3>

              <p className="mt-1 text-sm text-slate-400">
                Running total of recorded bet profit and loss, oldest to newest.
              </p>

              {chartData.length === 0 ? (
                <p className="py-20 text-center text-slate-500">
                  No betting history available.
                </p>
              ) : (
                <div className="mt-4 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#243044" />

                      <XAxis
                        dataKey="round"
                        stroke="#94a3b8"
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `#${value}`}
                      />

                      <YAxis
                        stroke="#94a3b8"
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `₹${value}`}
                      />

                      <Tooltip
                        labelFormatter={(value) => `Round #${value}`}
                        formatter={(value) => [money(Number(value)), "Cumulative P/L"]}
                        contentStyle={{
                          backgroundColor: "#0d1422",
                          border: "1px solid #334155",
                          borderRadius: 12,
                          color: "#fff",
                        }}
                      />

                      <Line
                        type="monotone"
                        dataKey="cumulativeProfit"
                        name="Cumulative P/L"
                        stroke="#22d3ee"
                        strokeWidth={3}
                        dot={false}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </article>

            {/* Bet type bar chart */}
            <article className="rounded-2xl border border-slate-800 bg-[#0d1422] p-5 sm:p-6 xl:col-span-2">
              <h3 className="text-lg font-bold">Performance by Bet Type</h3>

              <p className="mt-1 text-sm text-slate-400">
                Compare recorded wins and losses for UP, SEVEN, and DOWN bets.
              </p>

              <div className="mt-4 h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={betTypeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#243044" />

                    <XAxis
                      dataKey="type"
                      stroke="#94a3b8"
                      tickLine={false}
                      axisLine={false}
                    />

                    <YAxis
                      stroke="#94a3b8"
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                    />

                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0d1422",
                        border: "1px solid #334155",
                        borderRadius: 12,
                        color: "#fff",
                      }}
                    />

                    <Legend />

                    <Bar dataKey="wins" name="Wins" fill="#10b981" radius={[5, 5, 0, 0]} />

                    <Bar dataKey="losses" name="Losses" fill="#fb7185" radius={[5, 5, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>

          </div>
        </section>

        {/* Recent activity */}
        <section className="rounded-2xl border border-slate-800 bg-[#0d1422] p-5 sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">Recent Betting Activity</h2>

              <p className="mt-1 text-sm text-slate-400">
                Your latest recorded rounds.
              </p>
            </div>

            <span className="text-sm text-slate-500">
              Latest {recentRecords.length} bets
            </span>
          </div>

          {recentRecords.length === 0 ? (
            <p className="py-10 text-center text-slate-500">
              No betting activity yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="px-3 py-4">Date</th>
                    <th className="px-3 py-4">Dice</th>
                    <th className="px-3 py-4">Total</th>
                    <th className="px-3 py-4">Bet</th>
                    <th className="px-3 py-4">Amount</th>
                    <th className="px-3 py-4">Profit / Loss</th>
                  </tr>
                </thead>

                <tbody>
                  {recentRecords.map((record) => (
                    <tr key={record.id} className="border-b border-slate-800/70">
                      <td className="px-3 py-4 text-slate-400">
                        {new Date(record.createdAt).toLocaleString("en-IN")}
                      </td>

                      <td className="px-3 py-4">
                        {record.dice1} + {record.dice2}
                      </td>

                      <td className="px-3 py-4 font-bold">
                        {record.total}
                      </td>

                      <td className="px-3 py-4">{record.bet}</td>

                      <td className="px-3 py-4">
                        {money(record.amount)}
                      </td>

                      <td
                        className={`px-3 py-4 font-bold ${
                          record.profit >= 0
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}
                      >
                        {money(record.profit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Footer navigation */}
        <footer className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold transition hover:border-cyan-400"
          >
            Play Game
          </button>

          <button
            onClick={() => router.push("/profile")}
            className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold transition hover:border-cyan-400"
          >
            My Profile
          </button>

          <button
            onClick={() => router.push("/api/game/history")}
            className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold transition hover:border-cyan-400"
          >
            View History API
          </button>
        </footer>

        <p className="mt-8 text-center text-xs text-slate-500">
          Analytics are based on recorded virtual bets. Historical performance does not predict future outcomes.
        </p>

      </div>
    </main>
  );
}