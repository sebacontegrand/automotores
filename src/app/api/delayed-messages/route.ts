import { NextRequest, NextResponse } from "next/server";
import { pusherServer } from "@/lib/pusher";
import { prisma } from "@/lib/prisma";

const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

function checkAuth(req: NextRequest): boolean {
  const session = req.cookies.get("autovault_session");
  return session?.value === "full";
}

export async function GET(req: NextRequest) {
  try {
    if (!checkAuth(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let messages: Awaited<ReturnType<typeof prisma.delayedMessage.findMany>> = [];
    try {
      messages = await prisma.delayedMessage.findMany({
        where: {
          expiresAt: {
            gt: new Date()
          }
        },
        orderBy: { createdAt: "asc" }
      });
    } catch (e) {
      console.warn("Prisma error fetching delayed messages:", e);
    }

    return NextResponse.json(messages);
  } catch (error) {
    console.error("Delayed messages GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!checkAuth(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sender, content } = await req.json();

    if (!sender || !content) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + FIVE_DAYS_MS);

    const message = await prisma.delayedMessage.create({
      data: { sender, content, expiresAt },
    });

    await pusherServer.trigger("private-chat", "new-delayed-message", message);

    return NextResponse.json(message);
  } catch (error) {
    console.error("Delayed messages POST error:", error);
    return NextResponse.json({ error: "Failed to persist delayed message" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    if (!checkAuth(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, content } = await req.json();

    if (!id || !content) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    let message;
    try {
      message = await prisma.delayedMessage.update({
        where: { id },
        data: { content },
      });
    } catch (e) {
      console.warn("Prisma failed updating delayed message", e);
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    await pusherServer.trigger("private-chat", "update-delayed-message", message);

    return NextResponse.json(message);
  } catch (error) {
    console.error("Delayed messages PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!checkAuth(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    try {
      await prisma.delayedMessage.delete({
        where: { id },
      });
    } catch (e) {
      console.warn("Prisma failed deleting delayed message", e);
    }

    await pusherServer.trigger("private-chat", "delete-delayed-message", { id });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delayed messages DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
