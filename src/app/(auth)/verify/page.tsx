import Link from "next/link";

const LOGO_SVG = (
  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[var(--background)] paper-grid">
      {/* Left Pane - Brand Info (Desktop only) */}
      <div className="hidden md:flex md:w-1/2 bg-[#1f1d19] text-white flex-col justify-between p-16 relative overflow-hidden border-r border-[var(--line)]">
        <div className="absolute w-[500px] h-[500px] bg-white/5 rounded-full -top-40 -left-40 blur-3xl" />
        <div className="absolute w-[400px] h-[400px] bg-primary-500/15 rounded-full -bottom-20 -right-20 blur-3xl" />

        <div className="flex items-center gap-2.5 z-10">
          <Link href="/login" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary-600 flex items-center justify-center">{LOGO_SVG}</div>
            <span className="text-2xl font-black tracking-tight text-white">Speakly</span>
          </Link>
        </div>

        <div className="space-y-6 z-10 max-w-lg">
          <h1 className="text-4xl font-extrabold tracking-tight leading-tight">Almost there!</h1>
          <p className="text-[var(--foreground)]/40 leading-relaxed text-base">
            We need to verify your email address to keep your learning progress secure.
          </p>
        </div>

        <div className="text-[var(--foreground)]/70 text-xs z-10 font-medium">
          Speakly AI © 2026. Elevating language mastery.
        </div>
      </div>

      {/* Right Pane - Verification Notice */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[var(--background)]">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="text-center md:hidden mb-6">
            <div className="w-12 h-12 rounded-2xl bg-primary-600 flex items-center justify-center mx-auto">{LOGO_SVG}</div>
            <h2 className="text-3xl font-black text-[var(--foreground)] mt-2">Speakly</h2>
            <p className="text-[var(--foreground)]/55 text-sm mt-1">Practice English with AI</p>
          </div>

          <div className="sk-panel p-8 bg-[var(--surface-strong)] space-y-6">
            <div className="w-16 h-16 rounded-full bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center text-3xl mx-auto border border-primary-100 dark:border-primary-800 animate-pulse">
              📬
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-[var(--foreground)]">Check your email</h2>
              <p className="text-sm text-[var(--foreground)]/55 leading-relaxed">
                We sent a confirmation link to your email. Click it to activate your account and start practicing.
              </p>
            </div>
            <Link
              href="/login"
              className="inline-block w-full py-4 bg-[#1f1d19] hover:bg-[#171511] text-white text-sm font-extrabold rounded-xl transition-all shadow-[0_4px_0_rgba(0,0,0,0.25)] active:translate-y-[4px] active:shadow-none"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
