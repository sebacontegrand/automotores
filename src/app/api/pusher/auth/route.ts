import { NextRequest, NextResponse } from "next/server";
import { pusherServer } from "@/lib/pusher";

export async function POST(req: NextRequest) {
  try {
    const session = req.cookies.get("autovault_session");
    if (!session || session.value !== "full") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const data = await req.text();
    const params = new URLSearchParams(data);
    const socketId = params.get("socket_id");
    const channelName = params.get("channel_name");

    if (!socketId || !channelName) {
      return new NextResponse("Missing params", { status: 400 });
    }

    if (channelName.startsWith("presence-")) {
      const identityCookie = req.cookies.get("autovault_user_identity");
      const userIdentity = identityCookie?.value === "USER_B" ? "USER_B" : "USER_A";
      const presenceData = {
        user_id: userIdentity,
        user_info: { name: userIdentity },
      };
      const authResponse = pusherServer.authorizeChannel(socketId, channelName, presenceData);
      return NextResponse.json(authResponse);
    } else {
      const authResponse = pusherServer.authorizeChannel(socketId, channelName);
      return NextResponse.json(authResponse);
    }
  } catch (error) {
    console.error("Pusher auth error:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
