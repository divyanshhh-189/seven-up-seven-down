import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user || !user.wallet) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-[#070b14] px-4 py-8 text-white">
      <div className="mx-auto max-w-3xl">

        <div className="mb-8">
          <h1 className="text-3xl font-black">
            Player Profile
          </h1>

          <p className="mt-2 text-slate-400">
            Your account information
          </p>
        </div>

        <section className="rounded-3xl border border-slate-800 bg-[#0d1422] p-8 shadow-2xl">

          <div className="space-y-6">

            <div>
              <p className="text-sm text-slate-500">
                Username
              </p>

              <p className="mt-1 text-xl font-bold">
                {user.username}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">
                Email
              </p>

              <p className="mt-1 text-lg text-slate-300">
                {user.email}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">
                Wallet Balance
              </p>

              <p className="mt-1 text-3xl font-black text-cyan-400">
                ₹{user.wallet.balance.toLocaleString()}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">
                Member Since
              </p>

              <p className="mt-1 text-lg text-slate-300">
                {user.createdAt.toLocaleDateString()}
              </p>
            </div>

          </div>

          <div className="mt-8 border-t border-slate-800 pt-6">

            <a
              href="/"
              className="inline-block rounded-xl bg-cyan-400 px-6 py-3 font-bold text-slate-950 transition hover:bg-cyan-300"
            >
              Back to Game
            </a>

          </div>

        </section>

      </div>
    </main>
  );
}