"use client";

import type React from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const AVATAR_COLORS = [
  "#3B82F6", // blue
  "#EF4444", // red
  "#10B981", // green
  "#F59E0B", // amber
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#06B6D4", // cyan
  "#F97316", // orange
];

export default function CreateProfilePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password: password || undefined,
          avatarColor: selectedColor,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create profile");
      }

      const user = await response.json();

      // Set as current user, persist via cookie and redirect to hub
      sessionStorage.setItem("currentUserId", user.id);
      sessionStorage.setItem(
        "currentUser",
        JSON.stringify({
          id: user.id,
          name: user.name,
          email: user.email,
          avatarColor: user.avatarColor,
        })
      );

      // Also save user ID in a cookie so middleware can read it on API requests
      try {
        const cookieOptions = `path=/; max-age=${
          60 * 60 * 24 * 30
        }; samesite=Lax${
          typeof window !== "undefined" && window.location.protocol === "https:"
            ? "; Secure"
            : ""
        }`;
        document.cookie = `currentUserId=${encodeURIComponent(
          user.id
        )}; ${cookieOptions}`;
      } catch (e) {
        // non-fatal: cookie failed to set in unusual environments
        // eslint-disable-next-line no-console
        console.warn("Failed to set cookie for currentUserId", e);
      }

      // Dispatch custom event to force sync in UserSessionProvider
      window.dispatchEvent(new Event("userSessionChange"));

      router.push("/hub");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="fixed top-4 right-4">
        <ThemeToggle />
      </div>

      <Card className="w-full max-w-md p-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="mb-6 -ml-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Criar Perfil
          </h1>
          <p className="text-muted-foreground">Adicione um novo usuário</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Digite seu nome"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha (opcional)</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Deixe em branco para sem proteção"
            />
            <p className="text-xs text-muted-foreground">
              Se adicionar uma senha, ela será solicitada ao selecionar este
              perfil
            </p>
          </div>

          <div className="space-y-2">
            <Label>Cor do Avatar</Label>
            <div className="grid grid-cols-4 gap-3">
              {AVATAR_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={`w-full h-12 rounded-lg transition-all ${
                    selectedColor === color
                      ? "ring-4 ring-primary/50 scale-110"
                      : ""
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Criando..." : "Criar Perfil"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
