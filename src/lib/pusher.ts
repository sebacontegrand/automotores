import Pusher from "pusher";

export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID || "placeholder",
  key: process.env.NEXT_PUBLIC_PUSHER_KEY || "placeholder",
  secret: process.env.PUSHER_SECRET || "placeholder",
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "placeholder",
  useTLS: true,
});
