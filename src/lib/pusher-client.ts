import PusherClient from "pusher-js";

export const pusherClient = new PusherClient(
  process.env.NEXT_PUBLIC_PUSHER_KEY || "placeholder",
  {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "placeholder",
    authEndpoint: "/api/pusher/auth",
  }
);
