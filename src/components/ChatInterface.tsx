"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { pusherClient } from "@/lib/pusher-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, UserCircle, LogOut, Clock, MessageSquare, Pencil, Trash2, Check, X } from "lucide-react";

const FIVE_MINUTES_MS = 5 * 60 * 1000;
const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

function isExpired(msg: Message): boolean {
  return Date.now() - new Date(msg.createdAt).getTime() > FIVE_MINUTES_MS;
}

function filterExpired(msgs: Message[]): Message[] {
  return msgs.filter((m) => !isExpired(m));
}

function getDelayedOpacity(msg: DelayedMessage): number {
  const elapsed = Date.now() - new Date(msg.createdAt).getTime();
  const opacity = 1 - (0.7 * (elapsed / FIVE_DAYS_MS));
  return Math.max(0, opacity);
}

function filterExpiredDelayed(msgs: DelayedMessage[]): DelayedMessage[] {
  return msgs.filter((m) => getDelayedOpacity(m) > 0);
}

export type Message = {
  id: string;
  sender: "USER_A" | "USER_B";
  content: string;
  createdAt: Date | string;
};

export type DelayedMessage = {
  id: string;
  sender: "USER_A" | "USER_B";
  content: string;
  createdAt: Date | string;
  expiresAt: Date | string;
};

type Tab = "live" | "delayed";

export function ChatInterface({
  initialMessages,
  initialDelayedMessages = [],
}: {
  initialMessages: Message[];
  initialDelayedMessages?: DelayedMessage[];
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(filterExpired(initialMessages));
  const [delayedMessages, setDelayedMessages] = useState<DelayedMessage[]>(
    filterExpiredDelayed(initialDelayedMessages)
  );

  const [liveInput, setLiveInput] = useState("");
  const [delayedInput, setDelayedInput] = useState("");
  const [currentUser, setCurrentUser] = useState<"USER_A" | "USER_B" | null>(null);
  const currentUserRef = useRef<"USER_A" | "USER_B" | null>(null);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  const [otherUserOnline, setOtherUserOnline] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingSentRef = useRef<number>(0);
  const [activeTab, setActiveTab] = useState<Tab>("live");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const liveEndRef = useRef<HTMLDivElement>(null);
  const delayedEndRef = useRef<HTMLDivElement>(null);

  const sendTypingSignal = (isTyping: boolean) => {
    if (!currentUser) return;
    const now = Date.now();
    if (isTyping && now - lastTypingSentRef.current < 2000) return;
    if (isTyping) lastTypingSentRef.current = now;

    fetch("/api/pusher/typing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sender: currentUser, isTyping }),
    }).catch((err) => console.error("Failed to send typing status", err));
  };

  useEffect(() => {
    const presenceChannel = pusherClient.subscribe("presence-autovault");
    
    presenceChannel.bind("pusher:subscription_succeeded", (members: { count: number; myID: string; members: Record<string, { user_id: string }> }) => {
      const count = members.count;
      const myId = members.myID;
      
      if (count === 1) {
        setCurrentUser("USER_A");
        setOtherUserOnline(false);
      } else if (count >= 2) {
        const otherUserExists = members.members && Object.values(members.members).some(
          (m) => m.user_id !== myId
        );
        if (otherUserExists) {
          setCurrentUser("USER_B");
          setOtherUserOnline(true);
        } else {
          setCurrentUser("USER_A");
          setOtherUserOnline(false);
        }
      }
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
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
      }
    });

    privateChannel.bind("new-delayed-message", (message: DelayedMessage) => {
      setDelayedMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
    });

    privateChannel.bind("update-delayed-message", (message: DelayedMessage) => {
      setDelayedMessages((prev) =>
        prev.map((m) => (m.id === message.id ? { ...m, content: message.content } : m))
      );
    });

    privateChannel.bind("delete-delayed-message", (data: { id: string }) => {
      setDelayedMessages((prev) => prev.filter((m) => m.id !== data.id));
    });

    privateChannel.bind("typing-status", (data: { sender: string; isTyping: boolean }) => {
      if (data.sender !== currentUserRef.current) {
        if (data.isTyping) {
          setOtherUserTyping(true);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => {
            setOtherUserTyping(false);
          }, 3000);
        } else {
          setOtherUserTyping(false);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        }
      }
    });

    return () => {
      pusherClient.unsubscribe("presence-autovault");
      pusherClient.unsubscribe("private-chat");
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessages((prev) => filterExpired(prev));
      setDelayedMessages((prev) => filterExpiredDelayed(prev));
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTab === "live") {
      liveEndRef.current?.scrollIntoView({ behavior: "smooth" });
    } else {
      delayedEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, delayedMessages, activeTab]);

  const sendLiveMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!liveInput.trim() || !currentUser) return;

    sendTypingSignal(false);
    const content = liveInput;
    setLiveInput("");

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      sender: currentUser,
      content,
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sender: currentUser, content }),
      });
      if (res.ok) {
        const serverMsg = await res.json();
        setMessages((prev) => {
          if (prev.some((m) => m.id === serverMsg.id)) {
            return prev.filter((m) => m.id !== tempId);
          }
          return prev.map((m) =>
            m.id === tempId
              ? { ...serverMsg, createdAt: new Date(serverMsg.createdAt) }
              : m
          );
        });
      }
    } catch (err) {
      console.error("Failed to send message", err);
    }
  };

  const sendDelayedMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!delayedInput.trim() || !currentUser) return;

    sendTypingSignal(false);
    const content = delayedInput;
    setDelayedInput("");

    const tempId = `temp-delayed-${Date.now()}`;
    const optimisticMessage: DelayedMessage = {
      id: tempId,
      sender: currentUser,
      content,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + FIVE_DAYS_MS),
    };
    setDelayedMessages((prev) => [...prev, optimisticMessage]);

    try {
      const res = await fetch("/api/delayed-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sender: currentUser, content }),
      });
      if (res.ok) {
        const serverMsg = await res.json();
        setDelayedMessages((prev) => {
          if (prev.some((m) => m.id === serverMsg.id)) {
            return prev.filter((m) => m.id !== tempId);
          }
          return prev.map((m) =>
            m.id === tempId
              ? { ...serverMsg, createdAt: new Date(serverMsg.createdAt), expiresAt: new Date(serverMsg.expiresAt) }
              : m
          );
        });
      } else {
        console.error("Server returned non-OK status sending delayed message", res.status);
        setDelayedMessages((prev) => prev.filter((m) => m.id !== tempId));
      }
    } catch (err) {
      console.error("Failed to send delayed message", err);
      setDelayedMessages((prev) => prev.filter((m) => m.id !== tempId));
    }
  };

  const startEdit = (msg: DelayedMessage) => {
    setEditingId(msg.id);
    setEditContent(msg.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent("");
  };

  const saveEdit = async (id: string) => {
    if (!editContent.trim()) return;

    try {
      const res = await fetch("/api/delayed-messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, content: editContent }),
      });
      if (res.ok) {
        const updated = await res.json();
        setDelayedMessages((prev) =>
          prev.map((m) => (m.id === id ? { ...m, content: updated.content } : m))
        );
      }
    } catch (err) {
      console.error("Failed to edit message", err);
    }
    setEditingId(null);
    setEditContent("");
  };

  const deleteMessage = async (id: string) => {
    try {
      const res = await fetch("/api/delayed-messages", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setDelayedMessages((prev) => prev.filter((m) => m.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete message", err);
    }
  };

  if (!currentUser) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="text-slate-400 text-sm">Connecting...</div>
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
              router.refresh();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-semibold transition-colors"
            title="End session and return to gallery"
          >
            <LogOut className="w-3.5 h-3.5" />
            End Session
          </button>
        </div>
      </div>

      <div className="flex border-b border-slate-700/50">
        <button
          onClick={() => setActiveTab("live")}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            activeTab === "live"
              ? 'bg-slate-800 text-white border-b-2 border-blue-500'
              : 'bg-slate-900 text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Live Chat
        </button>
        <button
          onClick={() => setActiveTab("delayed")}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            activeTab === "delayed"
              ? 'bg-slate-800 text-white border-b-2 border-amber-500'
              : 'bg-slate-900 text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'
          }`}
        >
          <Clock className="w-4 h-4" />
          Delayed Messages
          {delayedMessages.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-amber-600/30 text-amber-400 rounded-full">
              {delayedMessages.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === "live" ? (
        <>
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
            <div ref={liveEndRef} />
          </div>

          {otherUserTyping && (
            <div className="px-4 py-2 bg-slate-900/90 border-t border-slate-800 flex items-center gap-2 text-xs text-slate-400">
              <div className="flex space-x-1 items-center">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></span>
              </div>
              <span className="font-medium text-slate-300">Partner is typing...</span>
            </div>
          )}

          <form onSubmit={sendLiveMessage} className="p-4 bg-slate-800 border-t border-slate-700 flex gap-2">
            <Input 
              value={liveInput}
              onChange={(e) => {
                setLiveInput(e.target.value);
                if (e.target.value.trim().length > 0) {
                  sendTypingSignal(true);
                } else {
                  sendTypingSignal(false);
                }
              }}
              placeholder="Type a secure message..." 
              className="flex-1 bg-slate-900 border-slate-700 text-white"
            />
            <Button type="submit" size="icon" disabled={!liveInput.trim()} className="bg-blue-600 hover:bg-blue-700">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col">
            {delayedMessages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                <Clock className="w-12 h-12 mb-4 opacity-50" />
                <p className="text-sm">No delayed messages yet</p>
                <p className="text-xs mt-1">Messages fade over 5 days then disappear</p>
              </div>
            ) : (
              delayedMessages.map((msg) => {
                const isMe = msg.sender === currentUser;
                const opacity = getDelayedOpacity(msg);
                const daysLeft = Math.ceil((new Date(msg.expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
                const isEditing = editingId === msg.id;

                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`} style={{ opacity }}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                      isMe
                        ? 'border-2 border-dashed border-blue-500/50 bg-blue-900/30 text-blue-100 rounded-br-sm'
                        : 'border-2 border-dashed border-slate-600/50 bg-slate-800/50 text-slate-200 rounded-bl-sm'
                    }`}>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span className="text-[10px] text-slate-400 font-medium">
                          {daysLeft > 0 ? `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left` : 'Expiring soon'}
                        </span>
                        {isMe && !isEditing && (
                          <div className="ml-auto flex items-center gap-1">
                            <button
                              onClick={() => startEdit(msg)}
                              className="p-1 rounded hover:bg-slate-700/50 transition-colors"
                              title="Edit message"
                            >
                              <Pencil className="w-3 h-3 text-slate-400 hover:text-white" />
                            </button>
                            <button
                              onClick={() => deleteMessage(msg.id)}
                              className="p-1 rounded hover:bg-red-900/50 transition-colors"
                              title="Delete message"
                            >
                              <Trash2 className="w-3 h-3 text-slate-400 hover:text-red-400" />
                            </button>
                          </div>
                        )}
                      </div>
                      {isEditing ? (
                        <div className="flex flex-col gap-2">
                          <Input
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="bg-slate-900 border-slate-600 text-white text-sm"
                            autoFocus
                          />
                          <div className="flex gap-1 justify-end">
                            <button
                              onClick={cancelEdit}
                              className="p-1 rounded hover:bg-slate-700/50 transition-colors"
                            >
                              <X className="w-4 h-4 text-slate-400" />
                            </button>
                            <button
                              onClick={() => saveEdit(msg.id)}
                              className="p-1 rounded hover:bg-green-900/50 transition-colors"
                            >
                              <Check className="w-4 h-4 text-green-400" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p>{msg.content}</p>
                      )}
                      <span className={`text-[10px] mt-1 block ${isMe ? 'text-blue-200 text-right' : 'text-slate-400'}`}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={delayedEndRef} />
          </div>

          {otherUserTyping && (
            <div className="px-4 py-2 bg-slate-900/90 border-t border-slate-800 flex items-center gap-2 text-xs text-slate-400">
              <div className="flex space-x-1 items-center">
                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce"></span>
              </div>
              <span className="font-medium text-slate-300">Partner is typing...</span>
            </div>
          )}

          <form onSubmit={sendDelayedMessage} className="p-4 bg-slate-800 border-t border-slate-700 flex gap-2">
            <Input 
              value={delayedInput}
              onChange={(e) => {
                setDelayedInput(e.target.value);
                if (e.target.value.trim().length > 0) {
                  sendTypingSignal(true);
                } else {
                  sendTypingSignal(false);
                }
              }}
              placeholder="Leave a message that fades over 5 days..." 
              className="flex-1 bg-slate-900 border-slate-700 text-white"
            />
            <Button type="submit" size="icon" disabled={!delayedInput.trim()} className="bg-amber-600 hover:bg-amber-700">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </>
      )}
    </>
  );
}
