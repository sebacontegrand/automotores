"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { UserCircle } from "lucide-react";

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PasswordModal({ isOpen, onClose }: PasswordModalProps) {
  const [password, setPassword] = useState("");
  const [userIdentity, setUserIdentity] = useState<"USER_A" | "USER_B">("USER_A");
  const [presence, setPresence] = useState<{ userAOnline: boolean; userBOnline: boolean }>({
    userAOnline: false,
    userBOnline: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      fetch("/api/presence")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) {
            setPresence(data);
            if (data.userAOnline && !data.userBOnline) {
              setUserIdentity("USER_B");
            } else {
              setUserIdentity("USER_A");
            }
          }
        })
        .catch((err) => console.error("Failed fetching presence:", err));
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, userIdentity }),
      });

      if (res.ok) {
        router.push("/chat");
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || "Invalid credentials");
      }
    } catch {
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 text-slate-50">
        <DialogHeader>
          <DialogTitle>Vehicle Inquiry</DialogTitle>
          <DialogDescription className="text-slate-400">
            Please enter your access code to view full details for this vehicle.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 font-medium mb-1.5 block">Access Code</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Access Code"
              className="bg-slate-950 border-slate-700 text-slate-50"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 font-medium mb-1.5 block">Select Identity for Communications</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setUserIdentity("USER_A")}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-semibold transition-all ${
                  userIdentity === "USER_A"
                    ? "bg-blue-600/20 border-blue-500 text-blue-300"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <UserCircle className="w-4 h-4" />
                <span>User A</span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    presence.userAOnline ? "bg-green-500" : "bg-slate-600"
                  }`}
                  title={presence.userAOnline ? "User A is currently online" : "User A is offline"}
                />
              </button>

              <button
                type="button"
                onClick={() => setUserIdentity("USER_B")}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-semibold transition-all ${
                  userIdentity === "USER_B"
                    ? "bg-amber-600/20 border-amber-500 text-amber-300"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <UserCircle className="w-4 h-4" />
                <span>User B</span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    presence.userBOnline ? "bg-green-500" : "bg-slate-600"
                  }`}
                  title={presence.userBOnline ? "User B is currently online" : "User B is offline"}
                />
              </button>
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading} className="text-slate-300 hover:text-white">
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !password}>
              {loading ? "Verifying..." : "Enter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
