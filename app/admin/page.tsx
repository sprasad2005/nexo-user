"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FullAdminDashboard } from "@/components/admin/FullAdminDashboard";
import { ShieldCheck } from "@phosphor-icons/react";

export default function AdminPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"LOADING" | "AUTHORIZED" | "UNAUTHORIZED">(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem("nexo_admin_authenticated") === "true") {
      return "AUTHORIZED";
    }
    return "LOADING";
  });

  useEffect(() => {
    document.title = "NEXO- Admin";
    let isMounted = true;
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        const isAdmin =
          data.authenticated &&
          (data.user?.role === "ADMIN" ||
            data.user?.role === "SUPER_ADMIN" ||
            data.member?.role === "ADMIN");

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
        try {
          sessionStorage.removeItem("nexo_admin_authenticated");
        } catch {}
        setStatus("UNAUTHORIZED");
        router.replace("/admin/login");
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
