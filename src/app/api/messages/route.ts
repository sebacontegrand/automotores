import { NextRequest, NextResponse } from "next/server";
import { pusherServer } from "@/lib/pusher";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = req.cookies.get("autovault_session");
    if (!session || session.value !== "full") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const identityCookie = req.cookies.get("autovault_user_identity");
    const sender = identityCookie?.value === "USER_B" ? "USER_B" : "USER_A";

    const { content } = await req.json().catch(() => ({ content: null }));

    if (!content) {
      return NextResponse.json({ error: "Missing content" }, { status: 400 });
    }

    let message;
    try {
      message = await prisma.message.create({
        data: { sender, content },
      });
    } catch (e) {
      console.warn("Prisma failed, creating fake message to broadcast", e);
      message = {
        id: Math.random().toString(),
        sender,
        content,
        createdAt: new Date(),
      };
    }

    await pusherServer.trigger("private-chat", "new-message", message);

    return NextResponse.json(message);
  } catch (error) {
    console.error("Message error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
