"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, ArrowRight, LockKey, ArrowLeft } from "@phosphor-icons/react";

function safeAdminNextPath(raw: string | null): string {
  if (!raw) return "/admin";
  try {
    const clean = decodeURIComponent(raw).trim();
    if (clean.startsWith("/login") || clean.startsWith("/admin/login")) return "/admin";
    const url = new URL(clean, "http://localhost");
    if (url.origin !== "http://localhost") return "/admin";
    if (url.pathname.startsWith("/login") || url.pathname.startsWith("/admin/login")) return "/admin";
    return url.pathname + url.search;
  } catch {
    return "/admin";
  }
}

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = safeAdminNextPath(searchParams.get("next"));

  const [identifier, setIdentifier] = useState("admin");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Redirect if already logged in as admin
  useEffect(() => {
    document.title = "NEXO- Admin";
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (
          d.authenticated &&
          (d.user?.role === "ADMIN" || d.user?.role === "SUPER_ADMIN" || d.member?.role === "ADMIN" || d.member?.role === "SUPER_ADMIN")
        ) {
          router.replace(nextPath);
        }
      })
      .catch(() => {});
  }, [router, nextPath]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!identifier.trim()) {
      setErrorMsg("Please enter your admin username.");
      return;
    }
    if (!password) {
      setErrorMsg("Password is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usernameOrEmail: identifier.trim(),
          password,
          context: "ADMIN",
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "Invalid administrator credentials.");
        setIsSubmitting(false);
        return;
      }

      try {
        sessionStorage.setItem("nexo_just_logged_in", "true");
      } catch {}

      window.location.href = nextPath;
    } catch {
      setErrorMsg("Unable to connect to the authentication server.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-[#090A0C] text-slate-900 dark:text-[#F5F7FA] font-sans antialiased relative overflow-hidden select-none transition-colors">
      {/* Background Grid Pattern */}
      <div
        className="absolute inset-0 opacity-25 dark:opacity-20 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(#2563EB 0.75px, transparent 0.75px), linear-gradient(to right, rgba(30, 41, 59, 0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(30, 41, 59, 0.2) 1px, transparent 1px)`,
          backgroundSize: `24px 24px, 48px 48px, 48px 48px`,
        }}
      />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-blue-600/10 dark:bg-[#6B93FF]/10 blur-[130px] rounded-full pointer-events-none" />

      <div className="w-full max-w-[420px] relative z-10">
        {/* Back to member login link */}
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-[#858D99] hover:text-slate-900 dark:hover:text-white transition-colors mb-6 font-medium group"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to member login</span>
        </Link>

        {/* Login Card */}
        <div className="bg-white dark:bg-[#101114] border border-slate-200 dark:border-[#252931] backdrop-blur-xl rounded-2xl p-7 sm:p-8 shadow-2xl">
          {/* Header Icon */}
          <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-[#17233D] border border-blue-200 dark:border-[#6B93FF]/30 text-blue-600 dark:text-[#6B93FF] flex items-center justify-center shadow-inner mb-4">
            <ShieldCheck size={24} weight="bold" />
          </div>

          {/* Console Badge & Title */}
          <div className="mb-6">
            <p className="text-[10px] font-extrabold tracking-widest text-slate-400 dark:text-[#858D99] uppercase font-mono mb-1">
              NEXO · ADMIN CONSOLE
            </p>
            <h1 className="text-2xl font-black text-slate-900 dark:text-[#F5F7FA] tracking-tight">
              Admin sign in
            </h1>
            <p className="text-xs text-slate-500 dark:text-[#858D99] mt-1 font-medium leading-relaxed">
              Secure access to the NEXO administrative workspace.
            </p>
          </div>

          {/* Error Alert */}
          {errorMsg && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 dark:bg-[#32191B] border border-rose-200 dark:border-[#FF6B6B]/30 text-rose-700 dark:text-[#FF6B6B] text-xs font-semibold flex items-center gap-2">
              <span className="shrink-0 text-sm">⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 font-sans">
            <div>
              <label
                htmlFor="admin-username"
                className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-[#858D99] mb-1.5 block"
              >
                USERNAME
              </label>
              <input
                id="admin-username"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="admin"
                autoComplete="username"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#14161A] border border-slate-200 dark:border-[#252931] text-xs text-slate-900 dark:text-[#F5F7FA] placeholder:text-slate-400 dark:placeholder:text-[#626A75] focus:outline-none focus:border-blue-600 dark:focus:border-[#6B93FF] focus:ring-1 focus:ring-blue-600/30 transition-all"
              />
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-[#858D99] mb-1.5 block"
              >
                PASSWORD
              </label>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="admin123"
                autoComplete="current-password"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#14161A] border border-slate-200 dark:border-[#252931] text-xs text-slate-900 dark:text-[#F5F7FA] placeholder:text-slate-400 dark:placeholder:text-[#626A75] focus:outline-none focus:border-blue-600 dark:focus:border-[#6B93FF] focus:ring-1 focus:ring-blue-600/30 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 dark:bg-[#6B93FF] hover:bg-blue-700 dark:hover:bg-[#7BA0FF] active:scale-[0.99] text-white dark:text-[#101114] font-bold text-xs shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              <span>{isSubmitting ? "Signing in..." : "Sign In to Admin Console"}</span>
              {!isSubmitting && <ArrowRight size={15} weight="bold" />}
            </button>
          </form>

          {/* Security Notice */}
          <div className="mt-7 pt-5 border-t border-slate-100 dark:border-[#1B1E23] text-center">
            <div className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-[#858D99]">
              <LockKey size={13} className="text-slate-400 dark:text-[#626A75]" />
              <span>Restricted administrative access</span>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-[#626A75] mt-0.5 font-normal">
              Authorized NEXO administrators only.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0A0C10] flex items-center justify-center text-xs text-slate-400 font-sans">
          Loading...
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}
