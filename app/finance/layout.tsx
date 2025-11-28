import { AiChat, SettingsDialog } from "@/modules/finance";
import {
  Briefcase,
  Building2,
  FolderOpen,
  Home,
  LayoutDashboard,
  Receipt,
  Tag,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import type React from "react";

const navigation = [
  { name: "Dashboard", href: "/finance", icon: LayoutDashboard },
  { name: "Lançamentos", href: "/finance/transactions", icon: Receipt },
  { name: "Investimentos", href: "/finance/investments", icon: Briefcase },
  { name: "Contas", href: "/finance/accounts", icon: Building2 },
  { name: "Categorias", href: "/finance/categories", icon: FolderOpen },
  { name: "Tags", href: "/finance/tags", icon: Tag },
];

export default function FinanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-6">
              <Link
                href="/hub"
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <Home className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">
                  Voltar ao HUB
                </span>
              </Link>
              <div className="h-6 w-px bg-border" />
              <div className="flex items-center gap-2">
                <Wallet className="w-6 h-6 text-primary" />
                <h1 className="text-xl font-bold text-foreground">
                  Gestão Financeira
                </h1>
              </div>
            </div>
            <div className="flex items-center">
              <SettingsDialog />
            </div>
          </div>
        </div>
      </header>

      {/* Secondary Navigation */}
      <nav className="border-b border-border bg-card/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-1 overflow-x-auto">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors rounded-lg whitespace-nowrap"
                >
                  <Icon className="w-4 h-4" />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">{children}</main>

      {/* AI Chat Assistant */}
      <AiChat />
    </div>
  );
}
