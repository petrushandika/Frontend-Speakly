import Link from "next/link";

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm text-center">
        <div className="text-5xl mb-4">📬</div>
        <h1 className="text-xl font-semibold text-gray-900">Check your email</h1>
        <p className="text-sm text-gray-500 mt-2 mb-6">
          We sent a confirmation link to your email. Click it to activate your account.
        </p>
        <Link
          href="/login"
          className="inline-block px-6 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
