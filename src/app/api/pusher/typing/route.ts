import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { pusherServer } from "@/lib/pusher";

function checkAuth(): boolean {
  const session = cookies().get("autovault_session");
  return session?.value === "full";
}

export async function POST(req: Request) {
  try {
    if (!checkAuth()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sender, isTyping } = await req.json();

    if (!sender) {
      return NextResponse.json({ error: "Missing sender" }, { status: 400 });
    }

    await pusherServer.trigger("private-chat", "typing-status", {
      sender,
      isTyping: Boolean(isTyping),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Pusher typing POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
