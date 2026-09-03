"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { pusherClient } from "@/lib/pusher-client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Send,
  UserCircle,
  LogOut,
  Clock,
  MessageSquare,
  Pencil,
  Trash2,
  Check,
  X,
  Eye,
  EyeOff,
  ArrowDown,
  Paperclip,
  FileText,
  Download,
  Loader2,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

const FIVE_MINUTES_MS = 5 * 60 * 1000;
const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

function isExpired(msg: Message): boolean {
  return Date.now() - new Date(msg.createdAt).getTime() > FIVE_MINUTES_MS;
}

function filterExpired(msgs: Message[]): Message[] {
  return msgs.filter((m) => !isExpired(m));
}

function getDelayedOpacity(msg: DelayedMessage): number {
  const createdAtMs = new Date(msg.createdAt).getTime();
  const expiresAtMs = msg.expiresAt
    ? new Date(msg.expiresAt).getTime()
    : createdAtMs + FIVE_DAYS_MS;
  const totalDuration = expiresAtMs - createdAtMs || FIVE_DAYS_MS;
  const elapsed = Date.now() - createdAtMs;

  if (elapsed <= 0) return 1;
  if (Date.now() >= expiresAtMs) return 0;

  const rawOpacity = 1 - elapsed / totalDuration;
  return Math.max(0, Math.min(1, rawOpacity));
}

function filterExpiredDelayed(msgs: DelayedMessage[]): DelayedMessage[] {
  const now = Date.now();
  return msgs.filter((m) => {
    const expiresAtMs = m.expiresAt
      ? new Date(m.expiresAt).getTime()
      : new Date(m.createdAt).getTime() + FIVE_DAYS_MS;
    return expiresAtMs > now && getDelayedOpacity(m) > 0;
  });
}

function getRemainingTimeLabel(msg: DelayedMessage): string {
  const expiresAtMs = msg.expiresAt
    ? new Date(msg.expiresAt).getTime()
    : new Date(msg.createdAt).getTime() + FIVE_DAYS_MS;
  const remainingMs = expiresAtMs - Date.now();

  if (remainingMs <= 0) return "Expired";

  const totalMinutes = Math.floor(remainingMs / (1000 * 60));
  const totalHours = Math.floor(totalMinutes / 60);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  if (days >= 1) {
    return hours > 0 ? `${days}d ${hours}h left` : `${days} day${days > 1 ? 's' : ''} left`;
  }
  if (totalHours >= 1) {
    const mins = totalMinutes % 60;
    return mins > 0 ? `${totalHours}h ${mins}m left` : `${totalHours} hour${totalHours > 1 ? 's' : ''} left`;
  }
  return `${Math.max(1, totalMinutes)} min${totalMinutes !== 1 ? 's' : ''} left`;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function isImageFile(fileType?: string | null, fileUrl?: string | null): boolean {
  if (fileType?.startsWith("image/")) return true;
  if (fileUrl) {
    const ext = fileUrl.split(".").pop()?.toLowerCase();
    if (ext && ["png", "jpg", "jpeg", "gif", "webp", "avif", "svg"].includes(ext)) {
      return true;
    }
  }
  return false;
}

function AttachmentDisplay({
  fileUrl,
  fileName,
  fileType,
  isMe,
}: {
  fileUrl: string;
  fileName?: string | null;
  fileType?: string | null;
  isMe?: boolean;
}) {
  const [isHidden, setIsHidden] = useState(false);
  const isImg = isImageFile(fileType, fileUrl);
  const displayName = fileName || fileUrl.split("/").pop() || "Attachment";

  if (isImg) {
    if (isHidden) {
      return (
        <div className="mt-1.5 flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setIsHidden(false)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/90 border border-slate-700 hover:bg-slate-700/80 text-slate-300 text-[11px] transition-colors shadow-sm"
          >
            <Eye className="w-3 h-3 text-blue-400" />
            <span>Show Image ({displayName})</span>
          </button>
        </div>
      );
    }

    return (
      <div className="mt-2 relative group">
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block relative overflow-hidden rounded-lg border border-slate-700/60 max-w-[200px] sm:max-w-sm"
        >
          <img
            src={fileUrl}
            alt={displayName}
            className="max-h-36 sm:max-h-56 w-auto object-cover rounded-lg group-hover:scale-105 transition-transform duration-200"
          />
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="bg-slate-900/90 text-white text-[11px] px-2.5 py-1 rounded-full backdrop-blur-sm flex items-center gap-1.5 font-medium shadow-lg">
              <Eye className="w-3.5 h-3.5" /> View full image
            </span>
          </div>
        </a>
        <button
          type="button"
          onClick={() => setIsHidden(true)}
          className="absolute top-1 right-1 p-1.5 rounded-full bg-slate-900/80 hover:bg-slate-900 text-slate-400 hover:text-white transition-colors backdrop-blur-sm shadow-md"
          title="Hide image preview"
        >
          <EyeOff className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2">
      <a
        href={fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        download={displayName}
        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-colors border ${
          isMe
            ? "bg-blue-700/40 hover:bg-blue-700/60 border-blue-400/30 text-white"
            : "bg-slate-800/80 hover:bg-slate-800 border-slate-600/50 text-slate-200"
        }`}
      >
        <div className="p-1.5 rounded-lg bg-slate-900/60 text-blue-400 shrink-0">
          <FileText className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate text-xs">{displayName}</p>
          <span className="text-[10px] text-slate-400 block">Click to download</span>
        </div>
        <Download className="w-3.5 h-3.5 text-slate-400 shrink-0 hover:text-white transition-colors" />
      </a>
    </div>
  );
}

export type Message = {
  id: string;
  sender: "USER_A" | "USER_B";
  content: string;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  createdAt: Date | string;
};

export type DelayedMessage = {
  id: string;
  sender: "USER_A" | "USER_B";
  content: string;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  createdAt: Date | string;
  expiresAt: Date | string;
};

type Tab = "live" | "delayed";

async function uploadFile(file: File): Promise<{ url: string; name: string; type: string } | null> {
  const formData = new FormData();
  formData.append("file", file);
  try {
    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error("Upload error:", err);
    return null;
  }
}

export function ChatInterface({
  currentUser,
  initialMessages,
  initialDelayedMessages = [],
}: {
  currentUser: "USER_A" | "USER_B";
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
  const currentUserRef = useRef<"USER_A" | "USER_B">(currentUser);

  const [liveFile, setLiveFile] = useState<File | null>(null);
  const [isUploadingLive, setIsUploadingLive] = useState(false);
  const liveFileInputRef = useRef<HTMLInputElement>(null);

  const [delayedFile, setDelayedFile] = useState<File | null>(null);
  const [isUploadingDelayed, setIsUploadingDelayed] = useState(false);
  const delayedFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  const [otherUserOnline, setOtherUserOnline] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingSentRef = useRef<number>(0);
  const [activeTab, setActiveTab] = useState<Tab>(
    initialDelayedMessages.length > 0 && filterExpired(initialMessages).length === 0 ? "delayed" : "live"
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isHeaderVisible, setIsHeaderVisible] = useState(false);
  const [isDraftVisible, setIsDraftVisible] = useState(true);
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const isScrolledUpRef = useRef(false);
  const liveEndRef = useRef<HTMLDivElement>(null);
  const delayedEndRef = useRef<HTMLDivElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const distanceFromBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
    const scrolledUp = distanceFromBottom > 80;
    setIsScrolledUp(scrolledUp);
    isScrolledUpRef.current = scrolledUp;
  };

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    if (activeTab === "live") {
      liveEndRef.current?.scrollIntoView({ behavior });
    } else {
      delayedEndRef.current?.scrollIntoView({ behavior });
    }
    setIsScrolledUp(false);
    isScrolledUpRef.current = false;
  };

  useEffect(() => {
    fetch("/api/delayed-messages")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: DelayedMessage[]) => {
        if (Array.isArray(data)) {
          setDelayedMessages(filterExpiredDelayed(data));
        }
      })
      .catch((err) => console.error("Failed fetching delayed messages on mount", err));
  }, []);

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
    
    presenceChannel.bind("pusher:subscription_succeeded", (members: { members: Record<string, { user_id: string }> }) => {
      const partnerRole = currentUserRef.current === "USER_A" ? "USER_B" : "USER_A";
      const isPartnerConnected = Boolean(members.members && members.members[partnerRole]);
      setOtherUserOnline(isPartnerConnected);
    });
    
    presenceChannel.bind("pusher:member_added", (member: { id: string }) => {
      const partnerRole = currentUserRef.current === "USER_A" ? "USER_B" : "USER_A";
      if (member.id === partnerRole) {
        setOtherUserOnline(true);
      }
    });
    
    presenceChannel.bind("pusher:member_removed", (member: { id: string }) => {
      const partnerRole = currentUserRef.current === "USER_A" ? "USER_B" : "USER_A";
      if (member.id === partnerRole) {
        setOtherUserOnline(false);
      }
    });

    const privateChannel = pusherClient.subscribe("private-chat");
    
    privateChannel.bind("new-message", (message: Message) => {
      if (!isExpired(message)) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
        if (!isScrolledUpRef.current) {
          setTimeout(() => liveEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
        }
      }
    });

    privateChannel.bind("new-delayed-message", (message: DelayedMessage) => {
      setDelayedMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
      if (!isScrolledUpRef.current) {
        setTimeout(() => delayedEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      }
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

  const [, setTicker] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTicker((t) => t + 1);
      setMessages((prev) => filterExpired(prev));
      setDelayedMessages((prev) => filterExpiredDelayed(prev));
    }, 10_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    scrollToBottom("auto");
  }, [activeTab]);

  const sendLiveMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!liveInput.trim() && !liveFile) || isUploadingLive || !currentUser) return;

    sendTypingSignal(false);
    const content = liveInput;
    const attachedFile = liveFile;

    setLiveInput("");
    setLiveFile(null);
    if (liveFileInputRef.current) liveFileInputRef.current.value = "";

    let uploaded: { url: string; name: string; type: string } | null = null;
    if (attachedFile) {
      setIsUploadingLive(true);
      uploaded = await uploadFile(attachedFile);
      setIsUploadingLive(false);
      if (!uploaded && !content.trim()) {
        console.error("Failed to upload file");
        return;
      }
    }

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      sender: currentUser,
      content,
      fileUrl: uploaded?.url || null,
      fileName: uploaded?.name || (attachedFile ? attachedFile.name : null),
      fileType: uploaded?.type || (attachedFile ? attachedFile.type : null),
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, optimisticMessage]);
    scrollToBottom("smooth");

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender: currentUser,
          content,
          fileUrl: uploaded?.url,
          fileName: uploaded?.name,
          fileType: uploaded?.type,
        }),
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
    if ((!delayedInput.trim() && !delayedFile) || isUploadingDelayed || !currentUser) return;

    sendTypingSignal(false);
    const content = delayedInput;
    const attachedFile = delayedFile;

    setDelayedInput("");
    setDelayedFile(null);
    if (delayedFileInputRef.current) delayedFileInputRef.current.value = "";

    let uploaded: { url: string; name: string; type: string } | null = null;
    if (attachedFile) {
      setIsUploadingDelayed(true);
      uploaded = await uploadFile(attachedFile);
      setIsUploadingDelayed(false);
      if (!uploaded && !content.trim()) {
        console.error("Failed to upload file");
        return;
      }
    }

    const tempId = `temp-delayed-${Date.now()}`;
    const optimisticMessage: DelayedMessage = {
      id: tempId,
      sender: currentUser,
      content,
      fileUrl: uploaded?.url || null,
      fileName: uploaded?.name || (attachedFile ? attachedFile.name : null),
      fileType: uploaded?.type || (attachedFile ? attachedFile.type : null),
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + FIVE_DAYS_MS),
    };
    setDelayedMessages((prev) => [...prev, optimisticMessage]);
    scrollToBottom("smooth");

    try {
      const res = await fetch("/api/delayed-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender: currentUser,
          content,
          fileUrl: uploaded?.url,
          fileName: uploaded?.name,
          fileType: uploaded?.type,
        }),
      });
      if (res.ok) {
        const serverMsg = await res.json();
        setDelayedMessages((prev) => {
          if (prev.some((m) => m.id === serverMsg.id)) {
            return prev.filter((m) => m.id !== tempId);
          }
          return prev.map((m) =>
            m.id === tempId
              ? {
                  ...serverMsg,
                  createdAt: new Date(serverMsg.createdAt),
                  expiresAt: new Date(serverMsg.expiresAt),
                }
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

  return (
    <>
      {isHeaderVisible ? (
        <>
          <div className="bg-slate-800/50 px-3 sm:px-4 py-2 flex items-center justify-between text-xs sm:text-sm border-b border-slate-700/50">
            <div className="flex items-center space-x-2">
              <UserCircle className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
              <span className="text-slate-300 font-medium">
                Identity: {currentUser === "USER_A" ? "User A" : "User B"}
              </span>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="flex items-center space-x-1.5">
                <div className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${otherUserOnline ? 'bg-green-500' : 'bg-slate-500'}`} />
                <span className="text-slate-400 text-xs">{otherUserOnline ? 'Online' : 'Offline'}</span>
              </div>
              <button
                onClick={async () => {
                  await fetch("/api/auth", { method: "DELETE" });
                  router.push("/");
                  router.refresh();
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-[11px] sm:text-xs font-semibold transition-colors"
                title="End session and return to gallery"
              >
                <LogOut className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                End Session
              </button>
              <button
                onClick={() => setIsHeaderVisible(false)}
                className="p-1 text-slate-400 hover:text-white transition-colors rounded hover:bg-slate-700/50 ml-1"
                title="Hide top bar and tabs"
              >
                <ChevronUp className="w-4 h-4" />
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
        </>
      ) : (
        <div className="bg-slate-900/90 px-3 py-1.5 flex items-center justify-between border-b border-slate-800 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${otherUserOnline ? 'bg-green-500' : 'bg-slate-500'}`} />
              <span className="text-slate-400 text-[11px] font-medium">
                {currentUser === "USER_A" ? "User A" : "User B"}
              </span>
            </div>
            <span className="text-slate-600">•</span>
            <div className="flex items-center bg-slate-800/80 rounded-md p-0.5 border border-slate-700/60">
              <button
                onClick={() => setActiveTab("live")}
                className={`px-2 py-0.5 text-[10px] sm:text-[11px] rounded font-medium transition-colors flex items-center gap-1 ${
                  activeTab === "live" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <MessageSquare className="w-3 h-3" />
                Live
              </button>
              <button
                onClick={() => setActiveTab("delayed")}
                className={`px-2 py-0.5 text-[10px] sm:text-[11px] rounded font-medium transition-colors flex items-center gap-1 ${
                  activeTab === "delayed" ? "bg-amber-600 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Clock className="w-3 h-3" />
                Delayed
                {delayedMessages.length > 0 && (
                  <span className="text-[9px] px-1 bg-black/30 rounded-full">
                    {delayedMessages.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          <button
            onClick={() => setIsHeaderVisible(true)}
            className="text-slate-400 hover:text-slate-200 text-[11px] flex items-center gap-1 py-1 px-2.5 rounded bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 transition-colors"
            title="Show full header and tabs"
          >
            <ChevronDown className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Show Tabs & Status</span>
            <span className="sm:hidden">Show</span>
          </button>
        </div>
      )}

      {activeTab === "live" ? (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col relative" onScroll={handleScroll}>
            {messages.map((msg) => {
              const isMe = msg.sender === currentUser;
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                    isMe 
                      ? 'bg-blue-600 text-white rounded-br-sm' 
                      : 'bg-slate-700 text-slate-100 rounded-bl-sm'
                  }`}>
                    {msg.content && <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>}
                    {msg.fileUrl && (
                      <AttachmentDisplay
                        fileUrl={msg.fileUrl}
                        fileName={msg.fileName}
                        fileType={msg.fileType}
                        isMe={isMe}
                      />
                    )}
                    <span className={`text-[10px] mt-1 block ${isMe ? 'text-blue-200 text-right' : 'text-slate-400'}`}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })}
            <div ref={liveEndRef} />
            {isScrolledUp && (
              <button
                onClick={() => scrollToBottom("smooth")}
                className="sticky bottom-2 self-center z-20 px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-blue-400 rounded-full shadow-lg border border-blue-500/40 transition-all flex items-center gap-1.5 text-xs font-semibold backdrop-blur-sm"
                title="Jump to latest messages"
              >
                <ArrowDown className="w-3.5 h-3.5 animate-bounce text-blue-400" />
                <span>Latest Messages</span>
              </button>
            )}
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

          {liveFile && (
            <div className="px-4 py-2 bg-slate-900/95 border-t border-blue-500/30 flex items-center justify-between text-xs text-blue-300">
              <div className="flex items-center gap-2 truncate">
                <Paperclip className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="font-medium truncate">{liveFile.name}</span>
                <span className="text-slate-400 text-[10px]">({formatFileSize(liveFile.size)})</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setLiveFile(null);
                  if (liveFileInputRef.current) liveFileInputRef.current.value = "";
                }}
                className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                title="Remove attachment"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <form onSubmit={sendLiveMessage} className="p-4 bg-slate-800 border-t border-slate-700 flex gap-2 items-center">
            <input
              type="file"
              ref={liveFileInputRef}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setLiveFile(e.target.files[0]);
                }
              }}
              className="hidden"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => liveFileInputRef.current?.click()}
              className="text-slate-400 hover:text-white hover:bg-slate-700/60 shrink-0"
              title="Attach file"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
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
            <Button
              type="submit"
              size="icon"
              disabled={(!liveInput.trim() && !liveFile) || isUploadingLive}
              className="bg-blue-600 hover:bg-blue-700 shrink-0"
            >
              {isUploadingLive ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col relative" onScroll={handleScroll}>
            {delayedMessages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                <Clock className="w-12 h-12 mb-4 opacity-50" />
                <p className="text-sm">No delayed messages yet</p>
                <p className="text-xs mt-1">Messages fade over 5 days then disappear</p>
              </div>
            ) : (
              delayedMessages.map((msg) => {
                const isMe = msg.sender === currentUser;
                const isUserA = msg.sender === "USER_A";
                const rawOpacity = getDelayedOpacity(msg);
                // Ensure text stays readable down to 0.18 opacity before expiration
                const visualOpacity = rawOpacity === 0 ? 0 : Math.max(0.18, rawOpacity);
                const opacityPercent = Math.round(rawOpacity * 100);
                const remainingLabel = getRemainingTimeLabel(msg);
                const isEditing = editingId === msg.id;

                // User A is on left margin (justify-start), User B is on right margin (justify-end)
                const sideClass = isUserA ? 'justify-start' : 'justify-end';

                return (
                  <div
                    key={msg.id}
                    className={`flex ${sideClass}`}
                    style={{ opacity: visualOpacity, transition: "opacity 1s ease-out" }}
                  >
                    <div className={`max-w-[88%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 ${
                      isUserA
                        ? 'border-2 border-dashed border-amber-500/50 bg-amber-950/30 text-amber-100 rounded-bl-sm shadow-md'
                        : 'border-2 border-dashed border-cyan-500/50 bg-cyan-950/30 text-cyan-100 rounded-br-sm shadow-md'
                    }`}>
                      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase ${
                          isUserA 
                            ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40' 
                            : 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40'
                        }`}>
                          {isUserA ? 'User A' : 'User B'}
                        </span>
                        <div className="flex items-center gap-1 text-[10px]">
                          <Clock className={`w-3 h-3 ${isUserA ? 'text-amber-400' : 'text-cyan-400'}`} />
                          <span className={`font-medium ${isUserA ? 'text-amber-300' : 'text-cyan-300'}`}>
                            {remainingLabel}
                          </span>
                        </div>
                        <span className="text-[9px] text-slate-400 font-mono bg-slate-900/80 px-1.5 py-0.5 rounded border border-slate-700/60 ml-auto sm:ml-0">
                          {opacityPercent}% opacity
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
                        <div className="flex flex-col gap-2 my-1">
                          <Textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            rows={3}
                            className="bg-slate-900 border-slate-600 text-white text-sm resize-none"
                            autoFocus
                          />
                          <div className="flex gap-1 justify-end">
                            <button
                              onClick={cancelEdit}
                              className="p-1.5 rounded hover:bg-slate-700/50 transition-colors"
                              title="Cancel edit"
                            >
                              <X className="w-4 h-4 text-slate-400" />
                            </button>
                            <button
                              onClick={() => saveEdit(msg.id)}
                              className="p-1.5 rounded hover:bg-green-900/50 transition-colors"
                              title="Save edit"
                            >
                              <Check className="w-4 h-4 text-green-400" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {msg.content && <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>}
                          {msg.fileUrl && (
                            <AttachmentDisplay
                              fileUrl={msg.fileUrl}
                              fileName={msg.fileName}
                              fileType={msg.fileType}
                              isMe={isMe}
                            />
                          )}
                        </>
                      )}
                      <span className={`text-[10px] mt-1.5 block ${isUserA ? 'text-amber-300/70 text-left' : 'text-cyan-300/70 text-right'}`}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={delayedEndRef} />
            {isScrolledUp && (
              <button
                onClick={() => scrollToBottom("smooth")}
                className="sticky bottom-2 self-center z-20 px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-amber-300 rounded-full shadow-lg border border-amber-500/40 transition-all flex items-center gap-1.5 text-xs font-semibold backdrop-blur-sm"
                title="Jump to latest messages"
              >
                <ArrowDown className="w-3.5 h-3.5 animate-bounce text-amber-400" />
                <span>Latest Messages</span>
              </button>
            )}
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

          {(delayedInput.trim().length > 0 || delayedFile) && (
            <div className="px-3 py-2 sm:px-4 sm:py-2 bg-slate-900/95 border-t border-amber-500/30 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs text-amber-400 font-medium">
                <button
                  type="button"
                  onClick={() => setIsDraftVisible((prev) => !prev)}
                  className="flex items-center gap-1.5 hover:text-amber-300 transition-colors"
                  title={isDraftVisible ? "Collapse draft preview" : "Expand draft preview"}
                >
                  <Eye className="w-3.5 h-3.5 text-amber-400" />
                  <span>Inspect Draft Before Sending</span>
                  {isDraftVisible ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                <span className="text-[10px] font-mono text-slate-400">
                  {delayedInput.trim().split(/\s+/).filter(Boolean).length} words • {delayedInput.length} chars
                </span>
              </div>
              {isDraftVisible && (
                <div className={`p-3 rounded-xl border-2 border-dashed ${
                  currentUser === "USER_A"
                    ? 'bg-amber-950/30 border-amber-500/50 text-amber-100'
                    : 'bg-cyan-950/30 border-cyan-500/50 text-cyan-100'
                } text-xs max-h-24 sm:max-h-36 overflow-y-auto shadow-inner`}>
                  <div className="flex items-center gap-1.5 mb-1.5 text-[10px]">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                      currentUser === "USER_A"
                        ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40'
                        : 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40'
                    }`}>
                      {currentUser === "USER_A" ? "User A" : "User B"} (Draft)
                    </span>
                    <Clock className="w-3 h-3 text-amber-400" />
                    <span className="text-amber-300 font-medium">5 days left</span>
                    <span className="text-slate-400 font-mono text-[9px] bg-slate-900/80 px-1.5 py-0.5 rounded border border-slate-700 ml-auto">
                      100% opacity
                    </span>
                  </div>
                  {delayedInput && <p className="whitespace-pre-wrap leading-relaxed text-sm">{delayedInput}</p>}
                  {delayedFile && (
                    <div className="mt-2 flex items-center gap-2 p-2 rounded bg-slate-900/70 border border-slate-700/60 text-slate-300 text-xs">
                      <Paperclip className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="truncate">{delayedFile.name}</span>
                      <span className="text-[10px] text-slate-400">({formatFileSize(delayedFile.size)})</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {delayedFile && (
            <div className="px-4 py-2 bg-slate-900/95 border-t border-amber-500/30 flex items-center justify-between text-xs text-amber-300">
              <div className="flex items-center gap-2 truncate">
                <Paperclip className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="font-medium truncate">{delayedFile.name}</span>
                <span className="text-slate-400 text-[10px]">({formatFileSize(delayedFile.size)})</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDelayedFile(null);
                  if (delayedFileInputRef.current) delayedFileInputRef.current.value = "";
                }}
                className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                title="Remove attachment"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <form onSubmit={sendDelayedMessage} className="p-3 sm:p-4 bg-slate-800 border-t border-slate-700 flex flex-col sm:flex-row gap-2.5">
            <input
              type="file"
              ref={delayedFileInputRef}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setDelayedFile(e.target.files[0]);
                }
              }}
              className="hidden"
            />
            <Textarea 
              value={delayedInput}
              onChange={(e) => {
                setDelayedInput(e.target.value);
                if (e.target.value.trim().length > 0) {
                  sendTypingSignal(true);
                } else {
                  sendTypingSignal(false);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (delayedInput.trim() || delayedFile) {
                    sendDelayedMessage(e);
                  }
                }
              }}
              placeholder="Leave a message that fades over 5 days... (Shift+Enter for new line)" 
              rows={2}
              className="flex-1 bg-slate-900 border-slate-700 text-white text-sm min-h-[50px] sm:min-h-[80px] max-h-[120px] sm:max-h-[180px] focus:ring-amber-500/50"
            />
            <div className="flex gap-2 items-center self-end sm:self-auto">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => delayedFileInputRef.current?.click()}
                className="text-slate-400 hover:text-white hover:bg-slate-700/60 shrink-0"
                title="Attach file"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <Button
                type="submit"
                disabled={(!delayedInput.trim() && !delayedFile) || isUploadingDelayed}
                className="bg-amber-600 hover:bg-amber-700 text-white gap-2 py-2.5 px-4 rounded-lg font-medium"
              >
                {isUploadingDelayed ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                <span className="text-xs sm:hidden">Send Message</span>
              </Button>
            </div>
          </form>
        </>
      )}
    </>
  );
}
