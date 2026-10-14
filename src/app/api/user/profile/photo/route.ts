import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

function hasValidSignature(bytes: Uint8Array, mimeType: string) {
  if (mimeType === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === "image/png") {
    return bytes.slice(0, 8).join(",") === "137,80,78,71,13,10,26,10";
  }
  if (mimeType === "image/webp") {
    return String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  }
  return false;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ success: false, message: "Log in to add a profile photo." }, { status: 401 });

  try {
    const form = await request.formData();
    const photo = form.get("photo");
    if (!(photo instanceof File)) {
      return Response.json({ success: false, message: "Choose an image first." }, { status: 400 });
    }
    if (photo.size === 0 || photo.size > MAX_AVATAR_BYTES) {
      return Response.json({ success: false, message: "Choose an image smaller than 2 MB." }, { status: 400 });
    }

    const bytes = new Uint8Array(await photo.arrayBuffer());
    if (!hasValidSignature(bytes, photo.type)) {
      return Response.json({ success: false, message: "Use a JPG, PNG, or WebP image." }, { status: 400 });
    }

    await prisma.userAvatar.upsert({
      where: { userId: user.id },
      create: { userId: user.id, data: bytes, mimeType: photo.type },
      update: { data: bytes, mimeType: photo.type },
    });
    return Response.json({ success: true, message: "Profile photo updated." });
  } catch (error) {
    console.error("Profile photo upload error:", error);
    return Response.json({ success: false, message: "Could not save this photo." }, { status: 500 });
  }
}

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ success: false, message: "Log in to manage your profile photo." }, { status: 401 });

  await prisma.userAvatar.deleteMany({ where: { userId: user.id } });
  return Response.json({ success: true, message: "Profile photo removed." });
}
