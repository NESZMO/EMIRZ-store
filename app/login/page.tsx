"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EyeIcon } from "@/components/icons/EyeIcon";
import { fieldClass, primaryBtnClass } from "@/lib/ui";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [msg, setMsg] = useState("");
  const [hint, setHint] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setBusy(true);
    setMsg("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, rememberMe }),
    });
    setBusy(false);
    if (!res.ok) {
      setMsg("Incorrect username or password. Try again.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  function onForgotPassword() {
    setHint("Ask your manager to reset it in Settings, or use the default install login: manager / emirz123");
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-bg font-sans">
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "repeating-linear-gradient(115deg, oklch(19% 0.02 150) 0px, oklch(19% 0.02 150) 22px, oklch(16% 0.02 150) 22px, oklch(16% 0.02 150) 44px)",
        }}
      />
      <div className="absolute top-10 left-10 font-mono text-xs text-muted-7 tracking-wide hidden md:block">
        EMIRZ stoRe — Beverage Distribution
      </div>

      <form
        onSubmit={onSignIn}
        className="relative w-[400px] max-w-[92vw] bg-panel border border-line-strong rounded-[20px] px-9 py-10 shadow-[0_30px_80px_rgba(0,0,0,0.5)]"
      >
        <div className="flex items-center gap-2.5 mb-1.5">
          <div className="w-[34px] h-[34px] rounded-[9px] bg-gold flex items-center justify-center font-display font-bold text-bg text-base">
            E
          </div>
          <div className="font-display text-xl font-bold text-text">EMIRZ stoRe</div>
        </div>
        <div className="text-[13px] text-muted-2 mb-7">Beverage Distribution & Inventory Manager</div>

        <label className="block text-xs font-semibold text-muted mb-1.5">Username</label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="manager"
          autoComplete="username"
          className={`${fieldClass} mb-4`}
        />

        <label className="block text-xs font-semibold text-muted mb-1.5">Password</label>
        <div className="relative mb-4">
          <input
            type={showPw ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            className={`${fieldClass} pr-11`}
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-2 cursor-pointer"
            aria-label={showPw ? "Hide password" : "Show password"}
          >
            <EyeIcon open={showPw} />
          </button>
        </div>

        {msg && <div className="text-[12.5px] font-semibold text-danger -mt-1.5 mb-3.5">{msg}</div>}
        {hint && <div className="text-xs text-muted-4 -mt-1.5 mb-3.5">{hint}</div>}

        <div className="flex items-center justify-between mb-6">
          <label className="flex items-center gap-2 text-[13px] text-muted cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="accent-primary"
            />
            Remember me
          </label>
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-[13px] text-gold cursor-pointer"
          >
            Forgot password?
          </button>
        </div>

        <button type="submit" disabled={busy} className={`${primaryBtnClass} w-full tracking-wide`}>
          {busy ? "Signing in…" : "Sign In"}
        </button>
        <div className="text-center mt-4.5 text-xs text-muted-7">
          v1.0 · Core modules — more coming soon
        </div>
      </form>
    </div>
  );
}
