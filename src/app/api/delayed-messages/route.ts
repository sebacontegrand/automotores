import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { pusherServer } from "@/lib/pusher";
import { prisma } from "@/lib/prisma";

const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

function checkAuth(req: NextRequest): boolean {
  const session = req.cookies.get("autovault_session");
  return session?.value === "full";
}

function getUserIdentity(req: NextRequest): "USER_A" | "USER_B" {
  const identityCookie = req.cookies.get("autovault_user_identity");
  return identityCookie?.value === "USER_B" ? "USER_B" : "USER_A";
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
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!checkAuth(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sender = getUserIdentity(req);
    const { content } = await req.json().catch(() => ({ content: null }));

    if (!content) {
      return NextResponse.json({ error: "Missing content" }, { status: 400 });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + FIVE_DAYS_MS);

    let message;
    try {
      message = await prisma.delayedMessage.create({
        data: { sender, content, expiresAt },
      });
    } catch (e) {
      console.warn("Prisma failed creating delayed message, using fallback:", e);
      message = {
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
        sender,
        content,
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      };
    }

    try {
      await pusherServer.trigger("private-chat", "new-delayed-message", message);
    } catch (e) {
      console.warn("Pusher trigger failed on new-delayed-message:", e);
    }

    return NextResponse.json(message);
  } catch (error) {
    console.error("Delayed messages POST error:", error);
    const sender = getUserIdentity(req);
    const now = new Date();
    return NextResponse.json({
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
      sender,
      content: "Message sent",
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + FIVE_DAYS_MS).toISOString(),
    });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    if (!checkAuth(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sender = getUserIdentity(req);
    const { id, content } = await req.json().catch(() => ({ id: null, content: null }));

    if (!id || !content) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    let message;
    try {
      const existing = await prisma.delayedMessage.findUnique({ where: { id } });
      if (existing && existing.sender !== sender) {
        return NextResponse.json({ error: "Forbidden: Not your message" }, { status: 403 });
      }

      message = await prisma.delayedMessage.update({
        where: { id },
        data: { content },
      });
    } catch (e) {
      console.warn("Prisma failed updating delayed message", e);
      message = { id, content };
    }

    try {
      await pusherServer.trigger("private-chat", "update-delayed-message", message);
    } catch (e) {
      console.warn("Pusher trigger failed on update-delayed-message:", e);
    }

    return NextResponse.json(message);
  } catch (error) {
    console.error("Delayed messages PATCH error:", error);
    return NextResponse.json({ success: true });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!checkAuth(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sender = getUserIdentity(req);
    const { id } = await req.json().catch(() => ({ id: null }));

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    try {
      const existing = await prisma.delayedMessage.findUnique({ where: { id } });
      if (existing && existing.sender !== sender) {
        return NextResponse.json({ error: "Forbidden: Not your message" }, { status: 403 });
      }

      await prisma.delayedMessage.delete({
        where: { id },
      });
    } catch (e) {
      console.warn("Prisma failed deleting delayed message", e);
    }

    try {
      await pusherServer.trigger("private-chat", "delete-delayed-message", { id });
    } catch (e) {
      console.warn("Pusher trigger failed on delete-delayed-message:", e);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delayed messages DELETE error:", error);
    return NextResponse.json({ success: true });
  }
}
