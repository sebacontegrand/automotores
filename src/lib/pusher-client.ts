import PusherClient from "pusher-js";

// Handle ESM/CJS default export interop for Next.js SSR
const Pusher = (PusherClient as unknown as { default: typeof PusherClient }).default || PusherClient;

export const pusherClient =
  typeof window !== "undefined"
    ? new Pusher(
        process.env.NEXT_PUBLIC_PUSHER_KEY || "placeholder",
        {
          cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "placeholder",
          authEndpoint: "/api/pusher/auth",
        }
      )
    : (null as unknown as InstanceType<typeof PusherClient>);

