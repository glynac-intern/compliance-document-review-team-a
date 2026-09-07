"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Mail,
  Lock,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { VerityLogo } from "@/components/ui/verity-logo";

const PROJECT_CARDS = [
  {
    title: "Intelligent Compliance Review",
    description:
      "Automating preliminary screening across marketing decks and client letters against SEC and FINRA disclosure rules in real time.",
  },
  {
    title: "Precise Regulatory Citations",
    description:
      "Detecting promissory claims, performance projections, and missing disclaimers with contextual risk scores and direct rule citations.",
  },
  {
    title: "Human-in-the-Loop Oversight",
    description:
      "AI delivers intelligent assistance while licensed compliance officers retain full authority to approve, reject, or request revisions.",
  },
  {
    title: "Immutable Audit Logging",
    description:
      "Preserving every comment, decision, and revision diff in an infallible record to ensure effortless regulatory examination readiness.",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [remember, setRemember] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showOtherModal, setShowOtherModal] = React.useState(false);

  // Swipable cards state
  const [currentSlide, setCurrentSlide] = React.useState(0);
  const [isHovered, setIsHovered] = React.useState(false);
  const touchStartXRef = React.useRef<number | null>(null);
  const touchEndXRef = React.useRef<number | null>(null);

  // Auto-advance cards smoothly every 7 seconds when not hovered
  React.useEffect(() => {
    if (isHovered) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % PROJECT_CARDS.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [isHovered]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % PROJECT_CARDS.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + PROJECT_CARDS.length) % PROJECT_CARDS.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartXRef.current !== null && touchEndXRef.current !== null) {
      const diff = touchStartXRef.current - touchEndXRef.current;
      if (diff > 40) {
        nextSlide();
      } else if (diff < -40) {
        prevSlide();
      }
    }
    touchStartXRef.current = null;
    touchEndXRef.current = null;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }

    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 650));

    const lower = email.toLowerCase();
    if (lower.includes("officer") || lower.includes("compliance") || lower.includes("sarah")) {
      setIsLoading(false);
      router.push("/officer");
    } else {
      setIsLoading(false);
      router.push("/advisor");
    }
  };

  const handleQuickLogin = (role: "advisor" | "officer") => {
    setShowOtherModal(false);
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      if (role === "officer") {
        router.push("/officer");
      } else {
        router.push("/advisor");
      }
    }, 450);
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#2f83c9] via-[#2575bc] to-[#1a5f9e] p-4 sm:p-6 overflow-hidden font-sans">
      {/* Soft background ambient radial lighting */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_50%)]" />

      {/* Circular back button in top-left matching screenshot */}
      <button
        type="button"
        onClick={() => router.push("/advisor")}
        aria-label="Go back"
        className="fixed top-6 left-6 z-30 h-11 w-11 rounded-full bg-white text-slate-800 shadow-md flex items-center justify-center transition-all hover:bg-slate-100 hover:scale-105 active:scale-95 cursor-pointer"
      >
        <ArrowLeft className="h-5 w-5 stroke-[2.2]" />
      </button>

      {/* Main Floating Card */}
      <div className="relative z-10 w-full max-w-[900px] rounded-[28px] bg-white shadow-[0_24px_70px_-15px_rgba(10,38,72,0.45)] overflow-hidden flex flex-col lg:flex-row min-h-[530px]">
        
        {/* LEFT PANEL — Artistic Blue Panel with 3D Spheres & Swipable Cards */}
        <div
          className="relative lg:w-[48%] bg-gradient-to-br from-[#2878bd] via-[#2370b3] to-[#18558c] text-white p-7 sm:p-9 flex flex-col justify-between overflow-hidden cursor-grab active:cursor-grabbing select-none"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* 3D Shaded Spheres (Color consistent with approved aesthetic) */}
          {/* Large Foreground Sphere overlapping right border */}
          <div
            className="absolute -bottom-14 -right-10 w-52 h-52 rounded-full z-10 pointer-events-none transition-transform duration-700 ease-out"
            style={{
              background: "radial-gradient(circle at 35% 30%, #5ba7ea 0%, #2677bf 42%, #124c82 80%, #0c3359 100%)",
              boxShadow: "-10px 14px 28px rgba(8, 28, 52, 0.45)",
            }}
          />

          {/* Medium Left Sphere */}
          <div
            className="absolute -bottom-10 -left-12 w-48 h-48 rounded-full z-0 pointer-events-none"
            style={{
              background: "radial-gradient(circle at 38% 32%, #4d9de2 0%, #206eb4 48%, #104170 85%, #092847 100%)",
              boxShadow: "6px 10px 24px rgba(6, 22, 42, 0.35)",
            }}
          />

          {/* Subtle Ambient Upper-Right Orb */}
          <div
            className="absolute -top-16 -right-12 w-40 h-40 rounded-full pointer-events-none opacity-40"
            style={{
              background: "radial-gradient(circle at 40% 40%, #68b2f2 0%, #2575bc 60%, #164f82 100%)",
            }}
          />

          {/* Header with Official Verity Trademark Logo */}
          <div className="relative z-20 pt-1">
            <VerityLogo
              size={26}
              markClassName="text-white"
              wordmarkClassName="text-white text-[15px] tracking-[0.2em]"
            />
          </div>

          {/* Swipable Card Content Container — Smooth Elegant Sliding Transition */}
          <div className="relative z-20 my-auto py-2 overflow-hidden w-full">
            <div
              className="flex transition-transform duration-[850ms] ease-[cubic-bezier(0.25,1,0.35,1)]"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {PROJECT_CARDS.map((card, idx) => {
                const isActive = currentSlide === idx;
                return (
                  <div
                    key={card.title}
                    className={cn(
                      "w-full shrink-0 min-h-[185px] flex flex-col justify-center transition-all duration-[750ms] ease-out pr-1 select-none",
                      isActive ? "opacity-100 scale-100" : "opacity-0 scale-[0.98] pointer-events-none"
                    )}
                  >
                    {/* Major headline in Inter — lifted up with comfortable gap to paragraph */}
                    <h2 className="text-[27px] sm:text-[32px] font-bold text-white leading-[1.14] tracking-tight font-sans mb-4 sm:mb-5 drop-shadow-sm -translate-y-2.5">
                      {card.title}
                    </h2>

                    {/* Shortened, elegant descriptive paragraph */}
                    <p className="text-[13px] sm:text-[13.5px] leading-relaxed text-blue-50/90 font-elegant font-normal max-w-[340px]">
                      {card.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Controls — Minimal Floating Carousel Bar Matching Image */}
          <div className="relative z-20 flex items-center justify-between pt-2">
            {/* Previous Arrow */}
            <button
              type="button"
              onClick={prevSlide}
              aria-label="Previous card"
              className="h-9 w-9 rounded-full bg-white/15 backdrop-blur-sm hover:bg-white/25 active:bg-white/35 text-white/90 hover:text-white flex items-center justify-center transition-all shadow-xs cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {/* Pill Indicators */}
            <div className="flex items-center gap-1.5">
              {PROJECT_CARDS.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentSlide(idx)}
                  aria-label={`Go to slide ${idx + 1}`}
                  className={`rounded-full transition-all duration-300 cursor-pointer ${
                    currentSlide === idx
                      ? "w-7 h-1.5 bg-white shadow-xs"
                      : "w-1.5 h-1.5 bg-white/40 hover:bg-white/70"
                  }`}
                />
              ))}
            </div>

            {/* Next Arrow */}
            <button
              type="button"
              onClick={nextSlide}
              aria-label="Next card"
              className="h-9 w-9 rounded-full bg-white/15 backdrop-blur-sm hover:bg-white/25 active:bg-white/35 text-white/90 hover:text-white flex items-center justify-center transition-all shadow-xs cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* RIGHT PANEL — Sign In Form */}
        <div className="relative flex-1 bg-white px-8 py-9 sm:px-12 sm:py-10 flex flex-col justify-center">
          
          {/* Subtle Blue Sphere peek in bottom-right corner matching screenshot */}
          <div
            className="absolute -bottom-10 -right-10 w-28 h-28 rounded-full pointer-events-none z-0"
            style={{
              background: "radial-gradient(circle at 40% 35%, #5ba7ea 0%, #2575bc 55%, #134675 100%)",
              opacity: 0.85,
            }}
          />

          <div className="relative z-10 w-full max-w-[340px] mx-auto">
            {/* Mobile Logo View */}
            <div className="lg:hidden mb-6">
              <VerityLogo
                size={22}
                markClassName="text-[#2575bc]"
                wordmarkClassName="text-slate-900 text-[14px] tracking-[0.2em]"
              />
            </div>

            {/* Header */}
            <div className="mb-6">
              <h2 className="text-[26px] font-bold text-slate-900 tracking-tight font-sans">
                Sign in
              </h2>
              <p className="text-[12px] text-slate-400 mt-1 font-roboto">
                Enter your credentials to access your compliance account
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700 mb-4 font-sans">
                <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Email Input */}
              <div>
                <div className="relative flex items-center rounded-xl bg-[#f4f6f8] border border-slate-200 transition-colors focus-within:border-[#2575bc] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#2575bc]/20">
                  <div className="pl-3.5 pr-2 text-slate-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError(null);
                    }}
                    placeholder="Email"
                    className="w-full h-11 bg-transparent pr-3.5 text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none font-sans"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <div className="relative flex items-center rounded-xl bg-[#f4f6f8] border border-slate-200 transition-colors focus-within:border-[#2575bc] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#2575bc]/20">
                  <div className="pl-3.5 pr-2 text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError(null);
                    }}
                    placeholder="Password"
                    className="w-full h-11 bg-transparent pr-2 text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none font-sans"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="pr-3.5 text-[11px] font-bold tracking-wider text-[#2575bc] hover:text-[#185386] transition-colors uppercase shrink-0 cursor-pointer select-none font-roboto"
                    tabIndex={-1}
                  >
                    {showPassword ? "HIDE" : "SHOW"}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-[#1e4c77] focus:ring-[#2575bc]"
                    disabled={isLoading}
                  />
                  <span className="text-[12px] text-slate-600 font-sans">Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={() => alert("Password reset link sent to registered enterprise email.")}
                  className="text-[12px] font-medium text-[#2575bc] hover:text-[#185386] hover:underline transition-colors font-sans"
                >
                  Forgot Password?
                </button>
              </div>

              {/* Primary Action — Sign In Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 rounded-xl bg-[#1e4c77] hover:bg-[#163c60] active:bg-[#112f4c] text-white font-semibold text-[14px] shadow-sm transition-all flex items-center justify-center cursor-pointer disabled:opacity-60 disabled:pointer-events-none mt-2 font-sans"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                ) : (
                  "Sign in"
                )}
              </button>

              {/* Or Divider */}
              <div className="relative flex items-center justify-center my-3.5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative bg-white px-3 text-[11px] text-slate-400 uppercase tracking-wider font-medium font-roboto">
                  Or
                </div>
              </div>

              {/* Secondary Action — Sign In With Other Button */}
              <button
                type="button"
                onClick={() => setShowOtherModal(true)}
                disabled={isLoading}
                className="w-full h-11 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 font-medium text-[13px] transition-all flex items-center justify-center cursor-pointer shadow-2xs font-sans"
              >
                Sign in with other
              </button>
            </form>

            {/* Footer Sign Up Link */}
            <div className="mt-5 text-center text-[12px] text-slate-500 font-sans">
              Don&apos;t have an account?{" "}
              <button
                type="button"
                onClick={() => alert("Enterprise account creation is managed by your organization compliance administrator.")}
                className="font-semibold text-[#2575bc] hover:text-[#185386] hover:underline"
              >
                Sign up
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Role Selection Modal (For testing / SSO) */}
      {showOtherModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 font-sans">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Sign In with SSO / Demo Role
            </h3>
            <p className="text-xs text-slate-500 mb-4 font-roboto">
              Select an account to access the Verity document review platform:
            </p>

            <div className="space-y-2.5">
              <button
                onClick={() => handleQuickLogin("officer")}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-[#2575bc] hover:bg-blue-50/50 transition-colors text-left group cursor-pointer"
              >
                <div>
                  <div className="text-xs font-semibold text-slate-900 group-hover:text-[#1e4c77]">
                    Compliance Officer
                  </div>
                  <div className="text-[11px] text-slate-500 font-roboto">
                    Sarah Jenkins · Queue, AI Flags, Approvals
                  </div>
                </div>
                <div className="h-6 w-6 rounded-full bg-blue-100 text-[#1e4c77] flex items-center justify-center text-[10px] font-bold">
                  SJ
                </div>
              </button>

              <button
                onClick={() => handleQuickLogin("advisor")}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-[#2575bc] hover:bg-blue-50/50 transition-colors text-left group cursor-pointer"
              >
                <div>
                  <div className="text-xs font-semibold text-slate-900 group-hover:text-[#1e4c77]">
                    Financial Advisor
                  </div>
                  <div className="text-[11px] text-slate-500 font-roboto">
                    James Adams · Submissions, Document Status
                  </div>
                </div>
                <div className="h-6 w-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-[10px] font-bold">
                  JA
                </div>
              </button>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowOtherModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
