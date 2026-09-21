"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, User, Loader2, Scale, Briefcase, Check } from "lucide-react";
import { VerityLogo } from "@/components/ui/verity-logo";
import { authApi, ApiError, type UserRole } from "@/lib/api-client";
import { cn } from "@/lib/utils";

const PASSWORD_MIN_LENGTH = 8; // mirrors the server's real rule (TA-14)

function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters long.`;
  }
  if (!/[a-zA-Z]/.test(password)) {
    return "Password must contain at least one letter.";
  }
  if (!/[0-9]/.test(password)) {
    return "Password must contain at least one digit.";
  }
  return null;
}

function validateEmail(email: string): string | null {
  const simplePattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!simplePattern.test(email)) {
    return "Please enter a valid email address.";
  }
  return null;
}

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [role, setRole] = React.useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!role) {
      setError("Please select a role.");
      return;
    }

    setIsLoading(true);
    try {
      await authApi.signup(name.trim(), email.trim(), password, role);
      router.push(`/login?signupSuccess=1&email=${encodeURIComponent(email.trim())}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to create your account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#2f83c9] via-[#2575bc] to-[#1a5f9e] p-4 sm:p-6 font-inter">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_50%)]" />

      <div className="relative z-10 w-full max-w-[420px] rounded-[28px] bg-white dark:bg-slate-900 shadow-[0_24px_70px_-15px_rgba(10,38,72,0.45)] px-8 py-9 sm:px-10 sm:py-10 font-inter">
        <div className="mb-5 flex justify-center">
          <VerityLogo size={24} markClassName="text-[#2575bc]" wordmarkClassName="text-slate-900 dark:text-slate-100 text-[14px] tracking-[0.2em]" />
        </div>

        <div className="mb-6 text-center">
          <h2 className="text-[22px] font-bold text-slate-900 dark:text-slate-100 tracking-tight font-inter">
            Create Account
          </h2>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200/90 dark:border-rose-900/50 bg-rose-50/90 dark:bg-rose-950/30 px-3.5 py-2.5 text-[12.5px] text-rose-700 dark:text-rose-300 mb-4 font-inter text-center font-normal animate-in fade-in duration-150 shadow-2xs">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative flex items-center rounded-xl bg-[#f4f6f8] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus-within:border-[#2575bc] dark:focus-within:border-[#7fb2e3] focus-within:bg-white dark:focus-within:bg-slate-800 focus-within:ring-2 focus-within:ring-[#2575bc]/20 dark:focus-within:ring-[#7fb2e3]/25">
            <div className="pl-3.5 pr-2 text-slate-400 dark:text-slate-500"><User className="h-4 w-4" /></div>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(null); }}
              placeholder="Full name"
              className="w-full h-11 bg-transparent pr-3.5 text-[13px] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none font-inter"
              disabled={isLoading}
            />
          </div>

          <div className="relative flex items-center rounded-xl bg-[#f4f6f8] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus-within:border-[#2575bc] dark:focus-within:border-[#7fb2e3] focus-within:bg-white dark:focus-within:bg-slate-800 focus-within:ring-2 focus-within:ring-[#2575bc]/20 dark:focus-within:ring-[#7fb2e3]/25">
            <div className="pl-3.5 pr-2 text-slate-400 dark:text-slate-500"><Mail className="h-4 w-4" /></div>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null); }}
              placeholder="Email"
              className="w-full h-11 bg-transparent pr-3.5 text-[13px] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none font-inter"
              disabled={isLoading}
            />
          </div>

          <div className="relative flex items-center rounded-xl bg-[#f4f6f8] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus-within:border-[#2575bc] dark:focus-within:border-[#7fb2e3] focus-within:bg-white dark:focus-within:bg-slate-800 focus-within:ring-2 focus-within:ring-[#2575bc]/20 dark:focus-within:ring-[#7fb2e3]/25">
            <div className="pl-3.5 pr-2 text-slate-400 dark:text-slate-500"><Lock className="h-4 w-4" /></div>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null); }}
              placeholder="Password"
              className="w-full h-11 bg-transparent pr-3.5 text-[13px] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none font-inter"
              disabled={isLoading}
            />
          </div>

          <div className="relative flex items-center rounded-xl bg-[#f4f6f8] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus-within:border-[#2575bc] dark:focus-within:border-[#7fb2e3] focus-within:bg-white dark:focus-within:bg-slate-800 focus-within:ring-2 focus-within:ring-[#2575bc]/20 dark:focus-within:ring-[#7fb2e3]/25">
            <div className="pl-3.5 pr-2 text-slate-400 dark:text-slate-500"><Lock className="h-4 w-4" /></div>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
              placeholder="Confirm password"
              className="w-full h-11 bg-transparent pr-3.5 text-[13px] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none font-inter"
              disabled={isLoading}
            />
          </div>

          {/* Role selection */}
          <div className="pt-2">
            <label className="block text-[12px] font-medium text-slate-500 dark:text-slate-400 mb-2 font-inter">
              Role
            </label>
            <div className="grid grid-cols-2 gap-2.5 font-inter">
              {/* Financial Advisor Card */}
              <button
                type="button"
                onClick={() => { setRole("advisor"); setError(null); }}
                disabled={isLoading}
                className={cn(
                  "group relative flex flex-col items-start p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer select-none",
                  role === "advisor"
                    ? "border-[#2575bc] dark:border-[#7fb2e3] bg-[#ebf4fb]/80 dark:bg-[#1e4c77]/20 ring-2 ring-[#2575bc]/25 dark:ring-[#7fb2e3]/30 shadow-xs"
                    : "border-slate-200/90 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50/70 dark:hover:bg-slate-700/50"
                )}
              >
                <div className="w-full flex items-center justify-between mb-2.5">
                  <div
                    className={cn(
                      "h-8 w-8 rounded-lg flex items-center justify-center transition-all duration-200",
                      role === "advisor"
                        ? "bg-[#2575bc] text-white shadow-2xs"
                        : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 group-hover:bg-slate-200/80 dark:group-hover:bg-slate-600/70 group-hover:text-slate-700 dark:group-hover:text-slate-200"
                    )}
                  >
                    <Briefcase className="h-4 w-4 stroke-[1.8]" />
                  </div>
                  <div
                    className={cn(
                      "h-4 w-4 rounded-full border flex items-center justify-center transition-all",
                      role === "advisor"
                        ? "border-[#2575bc] bg-[#2575bc] text-white"
                        : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                    )}
                  >
                    {role === "advisor" && <Check className="h-2.5 w-2.5 stroke-[2.5]" />}
                  </div>
                </div>

                <div
                  className={cn(
                    "text-[13px] font-semibold leading-snug transition-colors",
                    role === "advisor" ? "text-[#1e4c77] dark:text-[#7fb2e3]" : "text-slate-900 dark:text-slate-100"
                  )}
                >
                  Financial Advisor
                </div>
              </button>

              {/* Compliance Officer Card */}
              <button
                type="button"
                onClick={() => { setRole("officer"); setError(null); }}
                disabled={isLoading}
                className={cn(
                  "group relative flex flex-col items-start p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer select-none",
                  role === "officer"
                    ? "border-[#2575bc] dark:border-[#7fb2e3] bg-[#ebf4fb]/80 dark:bg-[#1e4c77]/20 ring-2 ring-[#2575bc]/25 dark:ring-[#7fb2e3]/30 shadow-xs"
                    : "border-slate-200/90 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50/70 dark:hover:bg-slate-700/50"
                )}
              >
                <div className="w-full flex items-center justify-between mb-2.5">
                  <div
                    className={cn(
                      "h-8 w-8 rounded-lg flex items-center justify-center transition-all duration-200",
                      role === "officer"
                        ? "bg-[#2575bc] text-white shadow-2xs"
                        : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 group-hover:bg-slate-200/80 dark:group-hover:bg-slate-600/70 group-hover:text-slate-700 dark:group-hover:text-slate-200"
                    )}
                  >
                    <Scale className="h-4 w-4 stroke-[1.8]" />
                  </div>
                  <div
                    className={cn(
                      "h-4 w-4 rounded-full border flex items-center justify-center transition-all",
                      role === "officer"
                        ? "border-[#2575bc] bg-[#2575bc] text-white"
                        : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                    )}
                  >
                    {role === "officer" && <Check className="h-2.5 w-2.5 stroke-[2.5]" />}
                  </div>
                </div>

                <div
                  className={cn(
                    "text-[13px] font-semibold leading-snug transition-colors",
                    role === "officer" ? "text-[#1e4c77] dark:text-[#7fb2e3]" : "text-slate-900 dark:text-slate-100"
                  )}
                >
                  Compliance Officer
                </div>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 rounded-xl bg-[#1e4c77] hover:bg-[#163c60] active:bg-[#112f4c] text-white font-semibold text-[14px] shadow-sm transition-all flex items-center justify-center disabled:opacity-60 !mt-5 font-inter cursor-pointer"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : "Create Account"}
          </button>
        </form>

        <div className="mt-5 text-center text-[12px] text-slate-500 dark:text-slate-400 font-inter">
          Already have an account?{" "}
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="font-semibold text-[#2575bc] dark:text-[#7fb2e3] hover:text-[#185386] dark:hover:text-[#a6cdf0] hover:underline font-inter cursor-pointer"
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
}
