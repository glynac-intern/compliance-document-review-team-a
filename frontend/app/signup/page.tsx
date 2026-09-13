"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, User, AlertCircle, Loader2, ShieldCheck, Briefcase } from "lucide-react";
import { VerityLogo } from "@/components/ui/verity-logo";
import { authApi, ApiError, type UserRole } from "@/lib/api-client";

const PASSWORD_MIN_LENGTH = 8; // mirrors the server's real rule (TA-14) --
// client-side validation is a fast first check, the server remains the
// actual authority and is what's genuinely enforced.

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

    // Client-side validation -- fast feedback only. The server is the
    // real authority: every one of these is re-checked there too, and
    // a client-side pass here is never treated as sufficient on its own.
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
      setError("Please select whether you're an advisor or a compliance officer.");
      return;
    }

    setIsLoading(true);
    try {
      await authApi.signup(name.trim(), email.trim(), password, role);
      router.push(`/login?signupSuccess=1&email=${encodeURIComponent(email.trim())}`);
    } catch (err) {
      // Server-side errors (e.g. duplicate email) shown with their real
      // message, not a generic one -- this is what actually matters,
      // client-side checks above only catch the easy cases early.
      setError(err instanceof ApiError ? err.message : "Unable to create your account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#2f83c9] via-[#2575bc] to-[#1a5f9e] p-4 sm:p-6 font-sans">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_50%)]" />

      <div className="relative z-10 w-full max-w-[440px] rounded-[28px] bg-white shadow-[0_24px_70px_-15px_rgba(10,38,72,0.45)] px-8 py-9 sm:px-10 sm:py-10">
        <div className="mb-6 flex justify-center">
          <VerityLogo size={24} markClassName="text-[#2575bc]" wordmarkClassName="text-slate-900 text-[14px] tracking-[0.2em]" />
        </div>

        <div className="mb-6 text-center">
          <h2 className="text-[24px] font-bold text-slate-900 tracking-tight">Create your account</h2>
          <p className="text-[12px] text-slate-400 mt-1">
            Sign up as an advisor or a compliance officer.
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700 mb-4">
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
              placeholder="Full name"
              className="w-full h-11 bg-transparent pr-3.5 text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none"
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
              className="w-full h-11 bg-transparent pr-3.5 text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none"
              disabled={isLoading}
            />
          </div>

          <div className="relative flex items-center rounded-xl bg-[#f4f6f8] border border-slate-200 focus-within:border-[#2575bc] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#2575bc]/20">
            <div className="pl-3.5 pr-2 text-slate-400"><Lock className="h-4 w-4" /></div>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null); }}
              placeholder="Password (min. 8 characters, 1 letter, 1 digit)"
              className="w-full h-11 bg-transparent pr-3.5 text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none"
              disabled={isLoading}
            />
          </div>

          <div className="relative flex items-center rounded-xl bg-[#f4f6f8] border border-slate-200 focus-within:border-[#2575bc] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#2575bc]/20">
            <div className="pl-3.5 pr-2 text-slate-400"><Lock className="h-4 w-4" /></div>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
              placeholder="Confirm password"
              className="w-full h-11 bg-transparent pr-3.5 text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none"
              disabled={isLoading}
            />
          </div>

          {/* Role selection -- explained clearly, since it's permanent */}
          <div className="pt-1">
            <p className="text-[12px] font-medium text-slate-700 mb-1.5">
              I am a...
            </p>
            <p className="text-[11px] text-slate-400 mb-2.5">
              This determines what you&apos;ll see in Verity. It cannot be changed later --
              choose the role that matches your actual job.
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => { setRole("advisor"); setError(null); }}
                disabled={isLoading}
                className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all ${
                  role === "advisor"
                    ? "border-[#2575bc] bg-blue-50/60 ring-2 ring-[#2575bc]/20"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <Briefcase className={`h-5 w-5 ${role === "advisor" ? "text-[#1e4c77]" : "text-slate-400"}`} />
                <span className="text-[12px] font-semibold text-slate-800">Financial Advisor</span>
                <span className="text-[10px] text-slate-500">Submit documents for review</span>
              </button>

              <button
                type="button"
                onClick={() => { setRole("officer"); setError(null); }}
                disabled={isLoading}
                className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all ${
                  role === "officer"
                    ? "border-[#2575bc] bg-blue-50/60 ring-2 ring-[#2575bc]/20"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <ShieldCheck className={`h-5 w-5 ${role === "officer" ? "text-[#1e4c77]" : "text-slate-400"}`} />
                <span className="text-[12px] font-semibold text-slate-800">Compliance Officer</span>
                <span className="text-[10px] text-slate-500">Review and decide on submissions</span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 rounded-xl bg-[#1e4c77] hover:bg-[#163c60] text-white font-semibold text-[14px] shadow-sm transition-all flex items-center justify-center disabled:opacity-60 mt-2"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
          </button>
        </form>

        <div className="mt-5 text-center text-[12px] text-slate-500">
          Already have an account?{" "}
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="font-semibold text-[#2575bc] hover:text-[#185386] hover:underline"
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
}
