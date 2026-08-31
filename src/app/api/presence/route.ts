import { NextResponse } from "next/server";
import { pusherServer } from "@/lib/pusher";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const res = await pusherServer.get({ path: "/channels/presence-autovault/users" });
    if (res.status === 200) {
      const body = await res.json();
      const users: { id: string }[] = body.users || [];
      const userIds = users.map((u) => u.id);
      return NextResponse.json({
        userAOnline: userIds.includes("USER_A"),
        userBOnline: userIds.includes("USER_B"),
      });
    }
  } catch (e) {
    console.warn("Failed to fetch presence from Pusher API:", e);
  }
  return NextResponse.json({ userAOnline: false, userBOnline: false });
}
