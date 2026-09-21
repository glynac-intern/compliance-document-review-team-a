"use client";

import * as React from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Mail,
  Lock,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { VerityLogo } from "@/components/ui/verity-logo";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api-client";

const PROJECT_CARDS = [
  {
    title: "Intelligent Compliance Review",
    description:
      "Automating preliminary compliance reviews across marketing decks and client letters against SEC and FINRA disclosure rules in real time.",
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

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, token, role: currentRole, isLoading: authLoading } = useAuth();
  const [email, setEmail] = React.useState(searchParams.get("email") ?? "");
  const [signupSuccess] = React.useState(searchParams.get("signupSuccess") === "1");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [remember, setRemember] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // If already authenticated with an active session, redirect to the appropriate dashboard
  React.useEffect(() => {
    if (!authLoading && token && currentRole) {
      router.replace(currentRole === "officer" ? "/officer" : "/advisor");
    }
  }, [authLoading, token, currentRole, router]);

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
      setError("Please Enter Your Email And Password.");
      return;
    }

    setIsLoading(true);
    try {
      // TA-61: real backend call, real JWT, real role read from the
      // token -- not a guess based on what the email string contains.
      const role = await login(email.trim(), password);
      router.push(role === "officer" ? "/officer" : "/advisor");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable To Sign In. Please Try Again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#2f83c9] via-[#2575bc] to-[#1a5f9e] p-4 sm:p-6 overflow-hidden font-inter">
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

      {/* Main Floating Card. The left brand panel below keeps its solid
          blue gradient in both themes (same as the KPI cards elsewhere) --
          only the white right-hand form panel needs dark: pairing. */}
      <div className="relative z-10 w-full max-w-[900px] rounded-[28px] bg-white dark:bg-slate-900 shadow-[0_24px_70px_-15px_rgba(10,38,72,0.45)] overflow-hidden flex flex-col lg:flex-row min-h-[530px]">

        {/* LEFT PANEL — Artistic Blue Panel with 3D Spheres & Swipable Cards */}
        <div
          className="relative lg:w-[48%] bg-gradient-to-br from-[#2878bd] via-[#2370b3] to-[#18558c] text-white p-7 sm:p-9 flex flex-col justify-between overflow-hidden cursor-grab active:cursor-grabbing select-none font-inter"
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
                    <h2 className="text-[27px] sm:text-[32px] font-bold text-white leading-[1.14] tracking-tight font-inter mb-4 sm:mb-5 drop-shadow-sm -translate-y-2.5">
                      {card.title}
                    </h2>

                    {/* Shortened, elegant descriptive paragraph */}
                    <p className="text-[13px] sm:text-[13.5px] leading-relaxed text-blue-50/90 font-inter font-normal max-w-[340px]">
                      {card.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Controls — Pill indicators on the left, paired arrows on the right */}
          <div className="relative z-20 flex items-center justify-between pt-2">
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

            {/* Navigation Arrows Grouped on Right with Space Between Them */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={prevSlide}
                aria-label="Previous card"
                className="h-9 w-9 rounded-full bg-white/15 backdrop-blur-sm hover:bg-white/25 active:bg-white/35 text-white/90 hover:text-white flex items-center justify-center transition-all shadow-xs cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
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
        </div>

        {/* RIGHT PANEL — Sign In Form */}
        <div className="relative flex-1 bg-white dark:bg-slate-900 px-8 py-9 sm:px-12 sm:py-10 flex flex-col justify-center">

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
                wordmarkClassName="text-slate-900 dark:text-slate-100 text-[14px] tracking-[0.2em]"
              />
            </div>

            {/* Header */}
            <div className="mb-6">
              <h2 className="text-[26px] font-bold text-slate-900 dark:text-slate-100 tracking-tight font-inter">
                Sign In
              </h2>
            </div>

            {/* Signup success message (TA-62) */}
            {signupSuccess && !error && (
              <div className="flex items-start gap-2 rounded-lg border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-2 text-[12px] text-emerald-700 dark:text-emerald-300 mb-4 font-inter">
                <span>Account Created. Please Sign In.</span>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="rounded-xl border border-rose-200/90 dark:border-rose-900/50 bg-rose-50/90 dark:bg-rose-950/30 px-3.5 py-2.5 text-[12.5px] text-rose-700 dark:text-rose-300 mb-4 font-inter text-center font-normal animate-in fade-in duration-150 shadow-2xs">
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Email Input */}
              <div>
                <div className="relative flex items-center rounded-xl bg-[#f4f6f8] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors focus-within:border-[#2575bc] dark:focus-within:border-[#7fb2e3] focus-within:bg-white dark:focus-within:bg-slate-800 focus-within:ring-2 focus-within:ring-[#2575bc]/20 dark:focus-within:ring-[#7fb2e3]/25">
                  <div className="pl-3.5 pr-2 text-slate-400 dark:text-slate-500">
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
                    className="w-full h-11 bg-transparent pr-3.5 text-[13px] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none font-inter"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <div className="relative flex items-center rounded-xl bg-[#f4f6f8] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors focus-within:border-[#2575bc] dark:focus-within:border-[#7fb2e3] focus-within:bg-white dark:focus-within:bg-slate-800 focus-within:ring-2 focus-within:ring-[#2575bc]/20 dark:focus-within:ring-[#7fb2e3]/25">
                  <div className="pl-3.5 pr-2 text-slate-400 dark:text-slate-500">
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
                    className="w-full h-11 bg-transparent pr-2 text-[13px] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none font-inter"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="pr-3.5 text-[11px] font-semibold tracking-wide text-[#2575bc] dark:text-[#7fb2e3] hover:text-[#185386] dark:hover:text-[#a6cdf0] transition-colors shrink-0 cursor-pointer select-none font-inter"
                    tabIndex={-1}
                  >
                    {showPassword ? "Hide" : "Show"}
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
                    className="h-3.5 w-3.5 rounded border-slate-300 dark:border-slate-600 text-[#1e4c77] dark:text-[#7fb2e3] focus:ring-[#2575bc] dark:focus:ring-[#7fb2e3]"
                    disabled={isLoading}
                  />
                  <span className="text-[12px] text-slate-600 dark:text-slate-400 font-inter">Remember Me</span>
                </label>
                <button
                  type="button"
                  onClick={() => alert("Password reset link sent to registered enterprise email.")}
                  className="text-[12px] font-medium text-[#2575bc] dark:text-[#7fb2e3] hover:text-[#185386] dark:hover:text-[#a6cdf0] hover:underline transition-colors font-inter"
                >
                  Forgot Password?
                </button>
              </div>

              {/* Primary Action — Sign In Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 rounded-xl bg-[#1e4c77] hover:bg-[#163c60] active:bg-[#112f4c] text-white font-semibold text-[14px] shadow-sm transition-all flex items-center justify-center cursor-pointer disabled:opacity-60 disabled:pointer-events-none mt-2 font-inter"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                ) : (
                  "Sign In"
                )}
              </button>

              {/* Or Divider */}
              <div className="relative flex items-center justify-center my-3.5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200 dark:border-slate-700" />
                </div>
                <div className="relative bg-white dark:bg-slate-900 px-3 text-[11px] text-slate-400 dark:text-slate-500 tracking-wider font-medium font-inter">
                  Or
                </div>
              </div>

              {/* Secondary Action — Sign Up Button */}
              <button
                type="button"
                onClick={() => router.push("/signup")}
                disabled={isLoading}
                className="w-full h-11 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 active:bg-slate-100 dark:active:bg-slate-600 text-slate-700 dark:text-slate-300 font-medium text-[13px] transition-all flex items-center justify-center cursor-pointer shadow-2xs font-inter"
              >
                Sign Up
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
