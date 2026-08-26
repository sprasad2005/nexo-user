"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useNexo } from "@/context/NexoContext";
import { Lock, Eye, EyeSlash, ShieldCheck, ArrowRight, WarningCircle, CircleNotch, Phone, Sparkle, CheckCircle, UploadSimple } from "@phosphor-icons/react";
import { uploadAvatar } from "@/src/features/profile/api";

function safeNextPath(raw: string | null): string {
  if (!raw) return "/";
  try {
    const clean = decodeURIComponent(raw).trim();
    if (clean.startsWith("/login") || clean.startsWith("/admin/login")) return "/";
    const url = new URL(clean, "http://localhost");
    if (url.origin !== "http://localhost") return "/";
    if (url.pathname.startsWith("/login") || url.pathname.startsWith("/admin/login")) return "/";
    return url.pathname + url.search;
  } catch {
    return "/";
  }
}

export function LoginForm() {
  const router = useRouter();
  const { login, authError, setAuthError, isAuthenticated, currentUser } = useNexo();

  const [usernameInput, setUsernameInput] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Post-login profile setup states
  const [step, setStep] = useState<"LOGIN" | "PROFILE_SETUP">("LOGIN");
  const [selectedAvatar, setSelectedAvatar] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [targetPath, setTargetPath] = useState<string>("/");

  const AVATAR_OPTIONS = [
    { id: "oggy", name: "Oggy", url: "/oggy.png" },
    { id: "jack", name: "Jack", url: "/jack.png" },
    { id: "sinchan", name: "Shinchan", url: "/sinchan.png" },
    { id: "doremon", name: "Doraemon", url: "/doremon.png" },
    { id: "japlu", name: "Japlu", url: "/japlu.png" },
  ];

  const getRandomAvatar = () => {
    const list = ["/oggy.png", "/jack.png", "/sinchan.png", "/doremon.png", "/japlu.png"];
    return list[Math.floor(Math.random() * list.length)];
  };

  const isFormSigningIn = React.useRef(false);

  // Auto redirect already authenticated users away from /login if already signed in on initial load
  React.useEffect(() => {
    if (
      isAuthenticated &&
      step === "LOGIN" &&
      !isFormSigningIn.current &&
      typeof window !== "undefined" &&
      window.location.pathname.startsWith("/login")
    ) {
      const params = new URLSearchParams(window.location.search);
      const nextParam = params.get("next");
      const role = currentUser?.role;
      const isAdmin = role === "SUPER_ADMIN" || role === "ADMIN";
      const target = nextParam ? safeNextPath(nextParam) : (isAdmin ? "/admin" : "/");
      router.replace(target);
    }
  }, [isAuthenticated, step, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    isFormSigningIn.current = true;
    setIsSubmitting(true);
    if (setAuthError) setAuthError(null);

    try {
      const res = await login(usernameInput, password);
      if (res.success) {
        const loggedInMember = res.member || currentUser;
        const isAdminUser = loggedInMember?.role === "SUPER_ADMIN" || loggedInMember?.role === "ADMIN" || res.role === "SUPER_ADMIN" || res.role === "ADMIN";

        let target = isAdminUser ? "/admin" : "/";
        if (typeof window !== "undefined") {
          const params = new URLSearchParams(window.location.search);
          const customNext = safeNextPath(params.get("next"));
          if (customNext !== "/") target = customNext;
        }
        setTargetPath(target);

        // Check if member already has a registered phone number
        const phone = loggedInMember?.phone;
        const hasPhone = Boolean(phone && typeof phone === "string" && phone.trim().length > 0) || isAdminUser;

        if (!hasPhone) {
          // First time login without a registered phone number -> prompt for phone number & profile setup
          setStep("PROFILE_SETUP");
        } else {
          try {
            sessionStorage.setItem("nexo_just_logged_in", "true");
          } catch {}

          router.push(target);
        }
      } else if (res.message && setAuthError) {
        setAuthError(res.message);
        isFormSigningIn.current = false;
      }
    } catch {
      if (setAuthError) setAuthError("Failed to sign in. Please verify your credentials.");
      isFormSigningIn.current = false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const [setupError, setSetupError] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setSetupError("Image size must be under 5MB.");
        return;
      }
      try {
        const res = await uploadAvatar(file);
        setSelectedAvatar(res.avatarUrl);
        if (setupError) setSetupError(null);
      } catch {
        setSetupError("Failed to process image.");
      }
    }
  };

  const handleFinishSetup = async (overrideAvatar?: string) => {
    if (!phoneNumber.trim()) {
      setSetupError("Mobile number is compulsory. Please enter your mobile number.");
      return;
    }
    setSetupError(null);
    setIsSubmitting(true);
    const chosenAvatar = overrideAvatar || selectedAvatar || getRandomAvatar();

    try {
      await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          avatar: chosenAvatar,
          phone: phoneNumber.trim(),
        }),
      }).catch(() => {});

      try {
        sessionStorage.setItem("nexo_just_logged_in", "true");
      } catch {}

      router.push(targetPath);
    } catch {
      router.push(targetPath);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#07080B] text-slate-100 font-sans flex flex-col md:flex-row antialiased overflow-x-hidden select-none">

      {/* ══════════════════════════════════════
          LEFT SIDE - BRAND HERO PANEL
      ══════════════════════════════════════ */}
      <div className="w-full md:w-1/2 min-h-[45vh] md:min-h-screen p-8 sm:p-12 md:p-16 flex flex-col justify-between border-b md:border-b-0 md:border-r border-[#1B1E28] bg-[#0A0C10] relative overflow-hidden">
        
        {/* Ambient Subtle Background Pattern */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(79,117,255,0.15) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        {/* Brand Header */}
        <div className="relative z-10">
          <span className="text-xl sm:text-2xl font-black tracking-widest text-white font-mono">
            NEXO
          </span>
        </div>

        {/* Hero Title & Features */}
        <div className="relative z-10 my-auto py-8 space-y-4 max-w-md">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
            NEXO Private Workspace
          </h1>

          <p className="text-sm text-slate-400 font-medium leading-relaxed">
            Track group IPO applications, live allotments, and portfolio performance in one secure workspace.
          </p>
        </div>

        {/* Left Footer */}
        <div className="relative z-10 flex items-center justify-between pt-4 border-t border-[#181B26]">
          <span className="text-xs text-slate-500 font-medium">
            © 2026 NEXO Private Workspace
          </span>

          <div className="w-8 h-8 rounded-full bg-[#12151E] border border-[#232735] flex items-center justify-center font-black text-white text-xs shadow-md">
            N
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          RIGHT SIDE - LOGIN / SETUP FORM PANEL
      ══════════════════════════════════════ */}
      <div className="w-full md:w-1/2 min-h-[55vh] md:min-h-screen p-8 sm:p-12 md:p-16 flex flex-col justify-between items-center bg-[#07080A] relative">

        <div className="w-full max-w-md my-auto space-y-7">
          {step === "PROFILE_SETUP" ? (
            <form onSubmit={(e) => { e.preventDefault(); handleFinishSetup(); }} className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
              {/* Badge Step Pill */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#121726] border border-[#202942] text-[#6B93FF] text-[10px] font-mono font-extrabold tracking-widest uppercase">
                <span className="w-2 h-2 rounded-full bg-[#4F75FF] animate-pulse" />
                <span>STEP 2 OF 2 · PROFILE SETUP</span>
              </div>

              {/* Title & Description */}
              <div>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  Setup Your Profile
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1.5 leading-relaxed">
                  Choose your avatar and enter your mobile number for <span className="font-mono font-bold text-[#6B93FF]">@{usernameInput.trim().toLowerCase()}</span>.
                </p>
              </div>

              {/* Live Selected Avatar Preview */}
              <div className="flex flex-col items-center justify-center p-5 bg-[#0D0F17] border border-[#1E2332] rounded-2xl relative">
                <div className="relative">
                  <img
                    src={selectedAvatar || getRandomAvatar()}
                    alt="Profile Preview"
                    className="w-20 h-20 rounded-full object-cover ring-4 ring-[#4F75FF]/30 border-2 border-[#4F75FF] shadow-xl shadow-blue-500/20"
                  />
                  <div className="absolute -bottom-1 -right-1 bg-[#4F75FF] text-white p-1 rounded-full shadow-md">
                    <CheckCircle size={14} weight="fill" />
                  </div>
                </div>
                <span className="text-xs font-extrabold text-white mt-3 tracking-wide">
                  {AVATAR_OPTIONS.find((a) => a.url === selectedAvatar)?.name || "Random Preset Avatar"}
                </span>
                <span className="text-[11px] text-slate-500 font-medium">Selected Workspace Identity</span>
              </div>

              {/* Error Alert */}
              {setupError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold flex items-start gap-2.5 animate-in fade-in">
                  <WarningCircle size={17} className="shrink-0 mt-0.5" />
                  <span className="leading-snug">{setupError}</span>
                </div>
              )}

              {/* Avatar Preset Grid */}
              <div className="space-y-2.5">
                <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-wider">
                  CHOOSE AVATAR PRESET
                </label>
                <div className="grid grid-cols-5 gap-2.5">
                  {AVATAR_OPTIONS.map((av) => {
                    const isSelected = selectedAvatar === av.url;
                    return (
                      <button
                        key={av.id}
                        type="button"
                        onClick={() => setSelectedAvatar(av.url)}
                        className={`flex flex-col items-center gap-1.5 p-2.5 rounded-2xl border transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? "border-[#4F75FF] bg-[#4F75FF]/20 scale-105 shadow-lg shadow-blue-500/20 ring-2 ring-[#4F75FF]/50"
                            : "border-[#232734] hover:border-slate-600 bg-[#11131B] hover:bg-[#181B26]"
                        }`}
                      >
                        <img src={av.url} alt={av.name} className="w-10 h-10 rounded-full object-cover border border-slate-700" />
                        <span className={`text-[10px] font-bold ${isSelected ? "text-[#6B93FF]" : "text-slate-400"}`}>
                          {av.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Phone Number Input */}
              <div className="space-y-2 pt-2 border-t border-[#1C1F2B]">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-wider">
                    MOBILE NUMBER <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <span className="text-[10px] text-slate-500 font-medium">Required for verification</span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Phone size={16} />
                  </div>
                  <input
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => {
                      setPhoneNumber(e.target.value);
                      if (setupError) setSetupError(null);
                    }}
                    placeholder="e.g. +91 98200 12345"
                    required
                    className={`w-full pl-10 pr-4 py-3.5 bg-[#11131B] border ${
                      setupError ? "border-rose-500/80 ring-2 ring-rose-500/20" : "border-[#232734] focus:border-[#4F75FF]"
                    } focus:ring-2 focus:ring-[#4F75FF]/20 rounded-xl text-xs sm:text-sm text-white placeholder:text-slate-500 outline-none transition-all duration-200`}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-4 border-t border-[#1C202E]">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSubmitting}
                  className="w-1/2 py-3.5 px-4 rounded-xl border border-[#2B3245] bg-[#121622] hover:bg-[#1A2030] hover:border-[#3D4760] text-slate-200 hover:text-white text-xs font-extrabold shadow-xs transition-all duration-200 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 group active:scale-[0.98]"
                >
                  <UploadSimple size={16} className="text-[#6B93FF] group-hover:-translate-y-0.5 transition-transform duration-200" weight="bold" />
                  <span>Upload Photo</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-1/2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#4F75FF] via-[#436AF5] to-[#3B5FE0] hover:from-[#3E64F0] hover:to-[#3254D0] text-white text-xs font-extrabold shadow-xl shadow-blue-500/25 transition-all duration-200 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98] ring-1 ring-white/10"
                >
                  {isSubmitting ? (
                    <>
                      <CircleNotch size={18} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <span>Complete Setup</span>
                      <ArrowRight size={15} weight="bold" />
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* Header */}
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  Sign in to NEXO
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1.5">
                  Access your private investment workspace.
                </p>
              </div>

              {/* Error Alert */}
              {authError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold flex items-start gap-2.5 animate-in fade-in">
                  <WarningCircle size={17} className="shrink-0 mt-0.5" />
                  <span className="leading-snug">{authError}</span>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Username */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => {
                      setUsernameInput(e.target.value);
                      if (authError && setAuthError) setAuthError(null);
                    }}
                    placeholder="Enter your username"
                    required
                    className="w-full px-4 py-3 bg-[#11131B] border border-[#232734] focus:border-[#4F75FF] focus:ring-2 focus:ring-[#4F75FF]/20 rounded-xl text-xs sm:text-sm text-white placeholder:text-slate-500 outline-none transition-all duration-200"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Password
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (authError && setAuthError) setAuthError(null);
                      }}
                      placeholder="Enter your password"
                      required
                      className="w-full px-4 py-3 pr-11 bg-[#11131B] border border-[#232734] focus:border-[#4F75FF] focus:ring-2 focus:ring-[#4F75FF]/20 rounded-xl text-xs sm:text-sm text-white placeholder:text-slate-500 outline-none transition-all duration-200"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-xl bg-[#4F75FF] hover:bg-[#3E64F0] active:scale-[0.98] text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-500/25 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                >
                  {isSubmitting ? (
                    <>
                      <CircleNotch size={18} className="animate-spin" />
                      <span>Signing In...</span>
                    </>
                  ) : (
                    <span>Sign In</span>
                  )}
                </button>
              </form>

              {/* Protected Workspace Subtext */}
              <div className="pt-4 border-t border-[#1C1F2B] text-center space-y-1">
                <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-400">
                  <Lock size={14} className="text-slate-400" />
                  <span>Protected private workspace</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Access restricted to authorized members provisioned by Admin.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Right Footer */}
        <div className="pt-6 text-center shrink-0">
          <span className="text-[11px] text-slate-500 font-mono font-semibold tracking-widest uppercase">
            NEXO WORKSPACE · 2026
          </span>
        </div>
      </div>

    </div>
  );
}
