"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { pusherClient } from "@/lib/pusher-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, UserCircle, LogOut } from "lucide-react";

const FIVE_MINUTES_MS = 5 * 60 * 1000;

function isExpired(msg: Message): boolean {
  return Date.now() - new Date(msg.createdAt).getTime() > FIVE_MINUTES_MS;
}

function filterExpired(msgs: Message[]): Message[] {
  return msgs.filter((m) => !isExpired(m));
}

export type Message = {
  id: string;
  sender: "USER_A" | "USER_B";
  content: string;
  createdAt: Date | string;
};

export function ChatInterface({ initialMessages }: { initialMessages: Message[] }) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(filterExpired(initialMessages));
  const [input, setInput] = useState("");
  const [currentUser, setCurrentUser] = useState<"USER_A" | "USER_B" | null>(null);
  const [otherUserOnline, setOtherUserOnline] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("autovault_user") as "USER_A" | "USER_B";
    if (savedUser) setCurrentUser(savedUser);
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const presenceChannel = pusherClient.subscribe("presence-autovault");
    
    presenceChannel.bind("pusher:subscription_succeeded", (members: { count: number }) => {
      if (members.count > 1) setOtherUserOnline(true);
    });
    
    presenceChannel.bind("pusher:member_added", () => {
      setOtherUserOnline(true);
    });
    
    presenceChannel.bind("pusher:member_removed", () => {
      setOtherUserOnline(false);
    });

    const privateChannel = pusherClient.subscribe("private-chat");
    
    privateChannel.bind("new-message", (message: Message) => {
      if (!isExpired(message)) {
        setMessages((prev) => [...prev, message]);
      }
    });

    return () => {
      pusherClient.unsubscribe("presence-autovault");
      pusherClient.unsubscribe("private-chat");
    };
  }, [currentUser]);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessages((prev) => filterExpired(prev));
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const selectUser = (user: "USER_A" | "USER_B") => {
    localStorage.setItem("autovault_user", user);
    setCurrentUser(user);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !currentUser) return;

    const messageData = { sender: currentUser, content: input };
    setInput("");

    try {
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(messageData),
      });
    } catch (err) {
      console.error("Failed to send message", err);
    }
  };

  if (!currentUser) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-6">
        <h3 className="text-2xl font-semibold text-white">Select Identity</h3>
        <div className="flex space-x-4">
          <Button onClick={() => selectUser("USER_A")} size="lg" className="bg-blue-600 hover:bg-blue-700">User A</Button>
          <Button onClick={() => selectUser("USER_B")} size="lg" className="bg-emerald-600 hover:bg-emerald-700">User B</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-slate-800/50 px-4 py-2 flex items-center justify-between text-sm border-b border-slate-700/50">
        <div className="flex items-center space-x-2">
          <UserCircle className="w-5 h-5 text-slate-400" />
          <span className="text-slate-300 font-medium">Identity: {currentUser}</span>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className={`w-2.5 h-2.5 rounded-full ${otherUserOnline ? 'bg-green-500' : 'bg-slate-500'}`} />
            <span className="text-slate-400">{otherUserOnline ? 'Partner Online' : 'Partner Offline'}</span>
          </div>
          <button
            onClick={async () => {
              await fetch("/api/auth", { method: "DELETE" });
              router.push("/");
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-semibold transition-colors"
            title="End session and return to gallery"
          >
            <LogOut className="w-3.5 h-3.5" />
            End Session
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col">
        {messages.map((msg) => {
          const isMe = msg.sender === currentUser;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                isMe 
                  ? 'bg-blue-600 text-white rounded-br-sm' 
                  : 'bg-slate-700 text-slate-100 rounded-bl-sm'
              }`}>
                <p>{msg.content}</p>
                <span className={`text-[10px] mt-1 block ${isMe ? 'text-blue-200 text-right' : 'text-slate-400'}`}>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="p-4 bg-slate-800 border-t border-slate-700 flex gap-2">
        <Input 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a secure message..." 
          className="flex-1 bg-slate-900 border-slate-700 text-white"
        />
        <Button type="submit" size="icon" disabled={!input.trim()} className="bg-blue-600 hover:bg-blue-700">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </>
  );
}
