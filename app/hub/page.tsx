"use client";

import type React from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Briefcase, LogOut, Settings, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface AppCard {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  available: boolean;
}

const apps: AppCard[] = [
  {
    id: "gestao-financeira",
    name: "Gestão Financeira",
    description: "Controle completo de receitas, despesas e investimentos",
    icon: Wallet,
    href: "/finance",
    available: true,
  },
  {
    id: "workstation",
    name: "Workstation",
    description: "Organize tarefas com Kanban, Pomodoro e controle de tempo",
    icon: Briefcase,
    href: "/workstation",
    available: true,
  },
];

export default function HubPage() {
  const router = useRouter();
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = sessionStorage.getItem("currentUserId");
    const userStr = sessionStorage.getItem("currentUser");

    if (!userId || !userStr) {
      router.push("/profiles");
      return;
    }

    try {
      const user = JSON.parse(userStr);
      setUserName(user.name);
    } catch {
      router.push("/profiles");
      return;
    }

    setLoading(false);
  }, [router]);

  function handleLogout() {
    sessionStorage.removeItem("currentUserId");
    sessionStorage.removeItem("currentUser");
    router.push("/profiles");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex justify-center flex-col gap-5 items-center mb-12">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-foreground mb-2 text-balance">
              HUB
            </h1>
            <p className="text-lg text-muted-foreground">Olá, {userName}!</p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="outline" asChild>
              <Link href="/profiles/edit">
                <Settings className="w-4 h-4 mr-2" />
                Editar Perfil
              </Link>
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Trocar Perfil
            </Button>
          </div>
        </div>

        {/* Apps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {apps.map((app) => {
            const Icon = app.icon;

            if (!app.available) {
              return (
                <Card
                  key={app.id}
                  className="p-8 flex flex-col items-center text-center gap-4 bg-card/50 border-2 border-dashed border-border hover:border-primary/30 transition-all duration-300 cursor-not-allowed opacity-60"
                >
                  <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center">
                    <Icon className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-2">
                      {app.name}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {app.description}
                    </p>
                  </div>
                </Card>
              );
            }

            return (
              <Link key={app.id} href={app.href}>
                <Card className="p-8 flex flex-col items-center text-center gap-4 bg-card border-2 border-border hover:border-primary hover:shadow-lg hover:shadow-primary/20 transition-all duration-300 cursor-pointer group">
                  <div className="w-20 h-20 rounded-2xl bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors duration-300">
                    <Icon className="w-10 h-10 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                      {app.name}
                    </h2>
                    <p className="text-sm text-muted-foreground text-balance">
                      {app.description}
                    </p>
                  </div>
                  <div className="mt-auto pt-4">
                    <span className="text-sm font-medium text-primary group-hover:underline">
                      Acessar →
                    </span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Footer */}
        <div className="text-center mt-16">
          <p className="text-sm text-muted-foreground">
            Desenvolvido com ♥ por{" "}
            <a
              href="https://linkedin.com/in/jpsdm"
              target="_blank"
              rel="noopener noreferrer"
            >
              João Pedro
            </a>{" "}
            - 2024
          </p>
        </div>
      </div>
    </div>
  );
}
