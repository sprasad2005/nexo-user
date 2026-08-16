"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FullAdminDashboard } from "@/components/admin/FullAdminDashboard";
import { ShieldCheck } from "@phosphor-icons/react";

import { AdminDataCache } from "@/lib/adminDataCache";

export default function AdminPage() {
  const router = useRouter();
  // \u26a0 Do NOT use browser APIs (sessionStorage / typeof window) inside useState
  // initializers — they produce different values on the server vs. the client and
  // cause React hydration errors. Start with a stable default that is identical
  // on both sides; the useEffect below will set the authoritative value.
  const [status, setStatus] = useState<"LOADING" | "AUTHORIZED" | "UNAUTHORIZED">("LOADING");

  useEffect(() => {
    document.title = "NEXO- Admin";
    let isMounted = true;

    AdminDataCache.fetchSWR(
      "admin_auth_status",
      async () => {
        const res = await fetch("/api/auth/me");
        return res.json();
      },
      { ttlMs: 60000 }
    )
      .then((data) => {
        if (!isMounted) return;
        const isAdmin =
          data?.authenticated &&
          (data.user?.role === "ADMIN" ||
            data.user?.role === "SUPER_ADMIN" ||
            data.member?.role === "ADMIN" ||
            data.member?.role === "SUPER_ADMIN");

        if (isAdmin) {
          try {
            sessionStorage.setItem("nexo_admin_authenticated", "true");
          } catch {}
          setStatus("AUTHORIZED");
        } else {
          try {
            sessionStorage.removeItem("nexo_admin_authenticated");
          } catch {}
          setStatus("UNAUTHORIZED");
          router.replace("/admin/login");
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setStatus("AUTHORIZED");
      });

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (status === "LOADING") {
    return (
      <div className="min-h-screen w-full bg-[#0A0C10] flex flex-col items-center justify-center text-slate-100 font-sans select-none">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-950/80 border border-blue-500/30 text-blue-400 flex items-center justify-center animate-pulse">
            <ShieldCheck size={28} weight="bold" />
          </div>
          <p className="text-xs font-semibold text-slate-400 tracking-wide">
            Verifying admin credentials...
          </p>
        </div>
      </div>
    );
  }

  if (status === "UNAUTHORIZED") {
    return (
      <div className="min-h-screen w-full bg-[#0A0C10] flex flex-col items-center justify-center text-slate-100 font-sans">
        <p className="text-xs font-semibold text-slate-400">
          Redirecting to Admin Sign In...
        </p>
      </div>
    );
  }

  return <FullAdminDashboard />;
}
