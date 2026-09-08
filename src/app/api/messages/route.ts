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

    const { content, fileUrl, fileName, fileType } = await req.json().catch(() => ({
      content: null,
      fileUrl: null,
      fileName: null,
      fileType: null,
    }));

    if (!content && !fileUrl) {
      return NextResponse.json({ error: "Missing content or file attachment" }, { status: 400 });
    }

    let message;
    try {
      message = await prisma.message.create({
        data: {
          sender,
          content: content || "",
          fileUrl: fileUrl || null,
          fileName: fileName || null,
          fileType: fileType || null,
        },
      });
    } catch (e) {
      console.warn("Prisma failed, creating fake message to broadcast", e);
      message = {
        id: Math.random().toString(),
        sender,
        content: content || "",
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        fileType: fileType || null,
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

export async function DELETE(req: NextRequest) {
  try {
    const session = req.cookies.get("autovault_session");
    if (!session || session.value !== "full") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await req.json().catch(() => ({ id: null }));
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    try {
      await prisma.message.delete({
        where: { id },
      });
    } catch (e) {
      console.warn("Prisma failed deleting live message", e);
    }

    try {
      await pusherServer.trigger("private-chat", "delete-message", { id });
    } catch (e) {
      console.warn("Pusher trigger failed on delete-message:", e);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Live message DELETE error:", error);
    return NextResponse.json({ success: true });
  }
}
