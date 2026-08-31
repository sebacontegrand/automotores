"use client";

import { useState, useEffect } from "react";
import { Lock, UserCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function PasswordGate() {
  const [password, setPassword] = useState("");
  const [userIdentity, setUserIdentity] = useState<"USER_A" | "USER_B">("USER_A");
  const [presence, setPresence] = useState<{ userAOnline: boolean; userBOnline: boolean }>({
    userAOnline: false,
    userBOnline: false,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
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
  }, []);

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
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || "Invalid password");
      }
    } catch {
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-800 mb-4">
            <Lock className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-white">Automotores</h1>
          <p className="mt-2 text-slate-400">Enter access code to continue</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Access Code"
              className="bg-slate-900 border-slate-700 text-white h-12 text-center text-lg"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 font-medium mb-1.5 block text-center">
              Select Identity for Communications
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setUserIdentity("USER_A")}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-semibold transition-all ${
                  userIdentity === "USER_A"
                    ? "bg-blue-600/20 border-blue-500 text-blue-300"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
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
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
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

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}
          <Button
            type="submit"
            disabled={loading || !password}
            className="w-full h-12 text-base"
          >
            {loading ? "Verifying..." : "Enter"}
          </Button>
        </form>
      </div>
    </div>
  );
}
