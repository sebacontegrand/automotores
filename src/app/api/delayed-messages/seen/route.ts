import { NextRequest, NextResponse } from "next/server";
import { pusherServer } from "@/lib/pusher";
import { prisma } from "@/lib/prisma";

function checkAuth(req: NextRequest): boolean {
  const session = req.cookies.get("autovault_session");
  return session?.value === "full";
}

export async function POST(req: NextRequest) {
  try {
    if (!checkAuth(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { ids } = await req.json().catch(() => ({ ids: [] }));
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No ids provided" }, { status: 400 });
    }

    try {
      await prisma.delayedMessage.updateMany({
        where: {
          id: { in: ids },
        },
        data: {
          seen: true,
          seenAt: new Date(),
        },
      });
    } catch (e) {
      console.warn("Prisma failed marking delayed messages as seen:", e);
    }

    try {
      await pusherServer.trigger("private-chat", "delayed-messages-seen", { ids });
    } catch (e) {
      console.warn("Pusher trigger failed on delayed-messages-seen:", e);
    }

    return NextResponse.json({ success: true, ids });
  } catch (error) {
    console.error("Delayed messages seen POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
