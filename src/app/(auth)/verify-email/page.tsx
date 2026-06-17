import Link from "next/link";

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      {/* Left Pane - Brand Info (Desktop only) */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-tr from-primary-700 via-indigo-700 to-violet-800 text-white flex-col justify-between p-16 relative overflow-hidden">
        {/* Decorative background circles */}
        <div className="absolute w-[500px] h-[500px] bg-white/5 rounded-full -top-40 -left-40 blur-3xl" />
        <div className="absolute w-[400px] h-[400px] bg-primary-500/20 rounded-full -bottom-20 -right-20 blur-3xl" />

        {/* Top brand */}
        <div className="flex items-center gap-2.5 z-10">
          <Link href="/login" className="flex items-center gap-2.5">
            <span className="text-3xl">🗣️</span>
            <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-indigo-100 bg-clip-text text-transparent">
              Speakly
            </span>
          </Link>
        </div>

        {/* Center content */}
        <div className="space-y-6 z-10 max-w-lg">
          <h1 className="text-4xl font-extrabold tracking-tight leading-tight">
            Almost there!
          </h1>
          <p className="text-indigo-100/90 leading-relaxed text-base">
            We need to verify your email address to make sure it&apos;s you and keep your learning progress secure.
          </p>
        </div>

        {/* Bottom footer */}
        <div className="text-indigo-200/50 text-xs z-10 font-medium">
          Speakly AI © 2026. Elevating language mastery.
        </div>
      </div>

      {/* Right Pane - Verification Notice */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md space-y-6 text-center">
          {/* Mobile brand header (Visible only on mobile) */}
          <div className="text-center md:hidden mb-6">
            <span className="text-4xl">🗣️</span>
            <h2 className="text-3xl font-extrabold text-slate-900 mt-2">Speakly</h2>
            <p className="text-slate-500 text-sm mt-1">Practice English with AI</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-8 shadow-sm space-y-6">
            <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-3xl mx-auto border border-indigo-100 animate-pulse">
              📬
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-900">Check your email</h2>
              <p className="text-sm text-slate-500 leading-relaxed">
                We sent a confirmation link to your email. Click it to activate your account and start practicing.
              </p>
            </div>

            <Link
              href="/login"
              className="inline-block w-full py-3 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-primary-500/10 active:scale-95"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
