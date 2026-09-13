"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, User, AlertCircle, Loader2, Scale, Briefcase, Check } from "lucide-react";
import { VerityLogo } from "@/components/ui/verity-logo";
import { authApi, ApiError, type UserRole } from "@/lib/api-client";
import { cn } from "@/lib/utils";

const PASSWORD_MIN_LENGTH = 8; // mirrors the server's real rule (TA-14)

function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password Must Be At Least ${PASSWORD_MIN_LENGTH} Characters Long.`;
  }
  if (!/[a-zA-Z]/.test(password)) {
    return "Password Must Contain At Least One Letter.";
  }
  if (!/[0-9]/.test(password)) {
    return "Password Must Contain At Least One Digit.";
  }
  return null;
}

function validateEmail(email: string): string | null {
  const simplePattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!simplePattern.test(email)) {
    return "Please Enter A Valid Email Address.";
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
      setError("Please Enter Your Name.");
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
      setError("Passwords Do Not Match.");
      return;
    }
    if (!role) {
      setError("Please Select Whether You're An Advisor Or A Compliance Officer.");
      return;
    }

    setIsLoading(true);
    try {
      await authApi.signup(name.trim(), email.trim(), password, role);
      router.push(`/login?signupSuccess=1&email=${encodeURIComponent(email.trim())}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable To Create Your Account. Please Try Again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#2f83c9] via-[#2575bc] to-[#1a5f9e] p-4 sm:p-6 font-inter">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_50%)]" />

      <div className="relative z-10 w-full max-w-[440px] rounded-[28px] bg-white shadow-[0_24px_70px_-15px_rgba(10,38,72,0.45)] px-8 py-9 sm:px-10 sm:py-10 font-inter">
        <div className="mb-6 flex justify-center">
          <VerityLogo size={24} markClassName="text-[#2575bc]" wordmarkClassName="text-slate-900 text-[14px] tracking-[0.2em]" />
        </div>

        <div className="mb-6 text-center">
          <h2 className="text-[24px] font-bold text-slate-900 tracking-tight font-inter">
            Create Your Account
          </h2>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700 mb-4 font-inter">
            <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="relative flex items-center rounded-xl bg-[#f4f6f8] border border-slate-200 focus-within:border-[#2575bc] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#2575bc]/20">
            <div className="pl-3.5 pr-2 text-slate-400"><User className="h-4 w-4" /></div>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(null); }}
              placeholder="Full Name"
              className="w-full h-11 bg-transparent pr-3.5 text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none font-inter"
              disabled={isLoading}
            />
          </div>

          <div className="relative flex items-center rounded-xl bg-[#f4f6f8] border border-slate-200 focus-within:border-[#2575bc] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#2575bc]/20">
            <div className="pl-3.5 pr-2 text-slate-400"><Mail className="h-4 w-4" /></div>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null); }}
              placeholder="Email"
              className="w-full h-11 bg-transparent pr-3.5 text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none font-inter"
              disabled={isLoading}
            />
          </div>

          <div className="relative flex items-center rounded-xl bg-[#f4f6f8] border border-slate-200 focus-within:border-[#2575bc] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#2575bc]/20">
            <div className="pl-3.5 pr-2 text-slate-400"><Lock className="h-4 w-4" /></div>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null); }}
              placeholder="Password (Min. 8 Characters, 1 Letter, 1 Digit)"
              className="w-full h-11 bg-transparent pr-3.5 text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none font-inter"
              disabled={isLoading}
            />
          </div>

          <div className="relative flex items-center rounded-xl bg-[#f4f6f8] border border-slate-200 focus-within:border-[#2575bc] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#2575bc]/20">
            <div className="pl-3.5 pr-2 text-slate-400"><Lock className="h-4 w-4" /></div>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
              placeholder="Confirm Password"
              className="w-full h-11 bg-transparent pr-3.5 text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none font-inter"
              disabled={isLoading}
            />
          </div>

          {/* Role selection */}
          <div className="pt-1.5">
            <label className="block text-[12px] font-semibold text-slate-800 mb-2 font-inter">
              I Am A...
            </label>
            <div className="grid grid-cols-2 gap-3 font-inter">
              {/* Financial Advisor Card */}
              <button
                type="button"
                onClick={() => { setRole("advisor"); setError(null); }}
                disabled={isLoading}
                className={cn(
                  "group relative flex flex-col items-start p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer select-none",
                  role === "advisor"
                    ? "border-[#2575bc] bg-[#ebf4fb]/80 ring-2 ring-[#2575bc]/25 shadow-xs"
                    : "border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/70"
                )}
              >
                <div className="w-full flex items-center justify-between mb-2.5">
                  <div
                    className={cn(
                      "h-9 w-9 rounded-xl flex items-center justify-center transition-all duration-200",
                      role === "advisor"
                        ? "bg-[#2575bc] text-white shadow-2xs"
                        : "bg-slate-100 text-slate-500 group-hover:bg-slate-200/80 group-hover:text-slate-700"
                    )}
                  >
                    <Briefcase className="h-[18px] w-[18px] stroke-[1.8]" />
                  </div>
                  <div
                    className={cn(
                      "h-4 w-4 rounded-full border flex items-center justify-center transition-all",
                      role === "advisor"
                        ? "border-[#2575bc] bg-[#2575bc] text-white"
                        : "border-slate-300 bg-white"
                    )}
                  >
                    {role === "advisor" && <Check className="h-2.5 w-2.5 stroke-[2.5]" />}
                  </div>
                </div>

                <div>
                  <div
                    className={cn(
                      "text-[13px] font-semibold leading-snug transition-colors",
                      role === "advisor" ? "text-[#1e4c77]" : "text-slate-900"
                    )}
                  >
                    Financial Advisor
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 leading-normal">
                    Submit Documents For Review
                  </div>
                </div>
              </button>

              {/* Compliance Officer Card */}
              <button
                type="button"
                onClick={() => { setRole("officer"); setError(null); }}
                disabled={isLoading}
                className={cn(
                  "group relative flex flex-col items-start p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer select-none",
                  role === "officer"
                    ? "border-[#2575bc] bg-[#ebf4fb]/80 ring-2 ring-[#2575bc]/25 shadow-xs"
                    : "border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/70"
                )}
              >
                <div className="w-full flex items-center justify-between mb-2.5">
                  <div
                    className={cn(
                      "h-9 w-9 rounded-xl flex items-center justify-center transition-all duration-200",
                      role === "officer"
                        ? "bg-[#2575bc] text-white shadow-2xs"
                        : "bg-slate-100 text-slate-500 group-hover:bg-slate-200/80 group-hover:text-slate-700"
                    )}
                  >
                    <Scale className="h-[18px] w-[18px] stroke-[1.8]" />
                  </div>
                  <div
                    className={cn(
                      "h-4 w-4 rounded-full border flex items-center justify-center transition-all",
                      role === "officer"
                        ? "border-[#2575bc] bg-[#2575bc] text-white"
                        : "border-slate-300 bg-white"
                    )}
                  >
                    {role === "officer" && <Check className="h-2.5 w-2.5 stroke-[2.5]" />}
                  </div>
                </div>

                <div>
                  <div
                    className={cn(
                      "text-[13px] font-semibold leading-snug transition-colors",
                      role === "officer" ? "text-[#1e4c77]" : "text-slate-900"
                    )}
                  >
                    Compliance Officer
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 leading-normal">
                    Review And Decide On Submissions
                  </div>
                </div>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 rounded-xl bg-[#1e4c77] hover:bg-[#163c60] active:bg-[#112f4c] text-white font-semibold text-[14px] shadow-sm transition-all flex items-center justify-center disabled:opacity-60 mt-3 font-inter cursor-pointer"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : "Create Account"}
          </button>
        </form>

        <div className="mt-5 text-center text-[12px] text-slate-500 font-inter">
          Already Have An Account?{" "}
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="font-semibold text-[#2575bc] hover:text-[#185386] hover:underline font-inter cursor-pointer"
          >
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
}
