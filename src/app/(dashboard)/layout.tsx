import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/chat", label: "Chat with Aria", icon: "💬" },
  { href: "/lessons", label: "Lessons", icon: "📚" },
  { href: "/vocabulary", label: "Vocabulary", icon: "📝" },
  { href: "/progress", label: "Progress", icon: "📈" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-white border-r border-gray-100 flex flex-col">
        <div className="px-5 py-4 border-b border-gray-100">
          <span className="text-lg font-bold text-primary-600">Speakly</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-700 transition-colors"
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-gray-100">
          <LogoutButton />
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-gray-100 flex items-center px-6">
          <h1 className="text-sm font-medium text-gray-500">
            English Learning Platform
          </h1>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
