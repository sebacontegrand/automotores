import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ChatInterface } from "@/components/ChatInterface";
import type { Message, DelayedMessage } from "@/components/ChatInterface";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ChatPage() {
  const cookieStore = cookies();
  const session = cookieStore.get("autovault_session");

  if (!session || session.value !== "full") {
    redirect("/");
  }

  let initialMessages: Message[] = [];
  try {
    initialMessages = await prisma.message.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 5 * 60 * 1000)
        }
      },
      orderBy: { createdAt: 'asc' }
    });
  } catch (e) {
    console.error("Prisma error, returning empty array. Did you run prisma db push?", e);
  }

  let initialDelayedMessages: DelayedMessage[] = [];
  try {
    initialDelayedMessages = await prisma.delayedMessage.findMany({
      where: {
        expiresAt: {
          gt: new Date()
        }
      },
      orderBy: { createdAt: 'asc' }
    });
  } catch (e) {
    console.error("Prisma error fetching delayed messages:", e);
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-4xl h-[80vh] bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col">
        <header className="bg-slate-800 p-4 border-b border-slate-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white tracking-tight">AutoVault Communications</h2>
          <span className="text-xs text-slate-400">Encrypted Channel</span>
        </header>
        <ChatInterface initialMessages={initialMessages} initialDelayedMessages={initialDelayedMessages} />
      </div>
    </div>
  );
}
