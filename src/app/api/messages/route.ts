import { NextResponse } from "next/server";
import { pusherServer } from "@/lib/pusher";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { sender, content } = await req.json();

    if (!sender || !content) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
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
