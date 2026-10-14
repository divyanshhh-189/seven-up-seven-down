"use client";

import { useRef, useState } from "react";
import type { ChangeEvent } from "react";

type ProfilePhotoProps = {
  userId: string;
  username: string;
  hasPhoto: boolean;
  photoVersion?: number;
};

export default function ProfilePhoto({ userId, username, hasPhoto, photoVersion }: ProfilePhotoProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(
    hasPhoto ? `/api/users/${userId}/avatar?v=${photoVersion ?? 0}` : null,
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function uploadPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setMessage("Choose an image smaller than 2 MB.");
      return;
    }

    const previousUrl = photoUrl;
    const previewUrl = URL.createObjectURL(file);
    setPhotoUrl(previewUrl);
    setBusy(true);
    setMessage("Uploading your photo…");

    try {
      const form = new FormData();
      form.append("photo", file);
      const response = await fetch("/api/user/profile/photo", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Could not save photo.");
      setPhotoUrl(`/api/users/${userId}/avatar?v=${Date.now()}`);
      setMessage("Profile photo updated.");
    } catch (error) {
      setPhotoUrl(previousUrl);
      setMessage(error instanceof Error ? error.message : "Could not save photo.");
    } finally {
      URL.revokeObjectURL(previewUrl);
      setBusy(false);
    }
  }

  async function removePhoto() {
    setBusy(true);
    setMessage("Removing photo…");
    try {
      const response = await fetch("/api/user/profile/photo", { method: "DELETE" });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Could not remove photo.");
      setPhotoUrl(null);
      setMessage("Photo removed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not remove photo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mb-6 flex flex-col gap-5 rounded-3xl border border-cyan-400/20 bg-[#0d1422] p-6 sm:flex-row sm:items-center">
      <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-cyan-300/70 bg-cyan-400/10 text-3xl font-black text-cyan-200 shadow-[0_0_28px_rgba(34,211,238,0.18)]">
        {photoUrl ? (
          // The URL is an authenticated same-origin profile image endpoint.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt={`${username}'s profile`} className="h-full w-full object-cover" />
        ) : (
          username.slice(0, 1).toUpperCase()
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="text-lg font-bold text-white">Player photo</h2>
        <p className="mt-1 text-sm text-slate-400">Add a photo so friends can recognize you in a room.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={uploadPhoto}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => fileInput.current?.click()}
            className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50"
          >
            {busy ? "Please wait…" : photoUrl ? "Change photo" : "Add profile photo"}
          </button>
          {photoUrl && (
            <button
              type="button"
              disabled={busy}
              onClick={removePhoto}
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-red-400/60 hover:text-red-300 disabled:opacity-50"
            >
              Remove
            </button>
          )}
        </div>
        <p aria-live="polite" className="mt-3 min-h-5 text-xs text-cyan-200/80">{message || "JPG, PNG, or WebP · 2 MB max"}</p>
      </div>
    </section>
  );
}
