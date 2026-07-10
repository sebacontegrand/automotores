"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PasswordModal({ isOpen, onClose }: PasswordModalProps) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
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
        // Success, redirect to chat
        router.push("/chat");
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
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Access Code"
              className="bg-slate-950 border-slate-700 text-slate-50"
              autoFocus
            />
            {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
          </div>
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
