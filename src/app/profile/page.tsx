import { redirect } from "next/navigation";
import ProfilePhoto from "@/app/profile/ProfilePhoto";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const user = await getCurrentUser();
  if (!user || !user.wallet) redirect("/login");
  const { setup } = await searchParams;

  const avatar = await prisma.userAvatar.findUnique({
    where: { userId: user.id },
    select: { updatedAt: true },
  });

  return (
    <main className="min-h-screen bg-[#070b14] px-4 py-8 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-black">Player Profile</h1>
          <p className="mt-2 text-slate-400">{setup === "1" ? "Your account is ready. Add a player photo now or anytime from your profile." : "Your account and player photo"}</p>
        </div>

        <ProfilePhoto
          userId={user.id}
          username={user.username}
          hasPhoto={Boolean(avatar)}
          photoVersion={avatar?.updatedAt.getTime()}
        />

        <section className="rounded-3xl border border-slate-800 bg-[#0d1422] p-8 shadow-2xl">
          <div className="space-y-6">
            <div>
              <p className="text-sm text-slate-500">Username</p>
              <p className="mt-1 text-xl font-bold">{user.username}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Email</p>
              <p className="mt-1 text-lg text-slate-300">{user.email}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Wallet Balance</p>
              <p className="mt-1 text-3xl font-black text-cyan-400">₹{user.wallet.balance.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Member Since</p>
              <p className="mt-1 text-lg text-slate-300">{user.createdAt.toLocaleDateString()}</p>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap gap-3 border-t border-slate-800 pt-6">
            <a href="/" className="rounded-xl bg-cyan-400 px-6 py-3 font-bold text-slate-950 transition hover:bg-cyan-300">Back to Game</a>
            <a href="/multiplayer" className="rounded-xl border border-cyan-400/40 px-6 py-3 font-bold text-cyan-200 transition hover:bg-cyan-400/10">Play with Friends</a>
          </div>
        </section>
      </div>
    </main>
  );
}
