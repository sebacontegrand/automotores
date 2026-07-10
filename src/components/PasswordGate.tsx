"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function PasswordGate() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
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
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Access Code"
            className="bg-slate-900 border-slate-700 text-white h-12 text-center text-lg"
            autoFocus
          />
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
