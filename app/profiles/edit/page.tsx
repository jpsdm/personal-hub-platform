"use client";

import type React from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TIMEZONES, DEFAULT_TIMEZONE } from "@/lib/timezone";
import { ArrowLeft, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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

interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
  timezone: string;
  hasPassword: boolean;
}

export default function EditProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState("");
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0]);
  const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [removePassword, setRemovePassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const userId = sessionStorage.getItem("currentUserId");
      if (!userId) {
        router.push("/profiles");
        return;
      }

      const response = await fetch(`/api/users/${userId}`);
      if (!response.ok) {
        throw new Error("Failed to load profile");
      }

      const data = await response.json();
      setProfile(data);
      setName(data.name);
      setSelectedColor(data.avatarColor || AVATAR_COLORS[0]);
      setTimezone(data.timezone || DEFAULT_TIMEZONE);
    } catch (err) {
      console.error("Error loading profile:", err);
      setError("Erro ao carregar perfil");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!profile) return;

    // Validate password if changing
    if (password && password !== confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }

    setSaving(true);

    try {
      const updateData: {
        name: string;
        avatarColor: string;
        timezone: string;
        password?: string | null;
      } = {
        name,
        avatarColor: selectedColor,
        timezone,
      };

      // Handle password changes
      if (removePassword) {
        updateData.password = null;
      } else if (password) {
        updateData.password = password;
      }

      const response = await fetch(`/api/users/${profile.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update profile");
      }

      const updatedUser = await response.json();

      // Update session storage
      sessionStorage.setItem(
        "currentUser",
        JSON.stringify({
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          avatarColor: updatedUser.avatarColor,
          timezone: updatedUser.timezone,
        })
      );

      // Dispatch storage event to notify other components about the timezone change
      window.dispatchEvent(new Event("storage"));

      setProfile(updatedUser);
      setPassword("");
      setConfirmPassword("");
      setRemovePassword(false);
      setSuccess(true);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground">Carregando perfil...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Perfil não encontrado</p>
          <Button onClick={() => router.push("/profiles")} className="mt-4">
            Voltar aos Perfis
          </Button>
        </div>
      </div>
    );
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
          onClick={() => router.push("/hub")}
          className="mb-6 -ml-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        <div className="text-center mb-8">
          <div
            className="w-24 h-24 rounded-lg mx-auto mb-4 flex items-center justify-center text-white text-3xl font-bold"
            style={{ backgroundColor: selectedColor }}
          >
            {name.charAt(0).toUpperCase()}
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Editar Perfil
          </h1>
          <p className="text-muted-foreground">{profile.email}</p>
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
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={profile.email}
              disabled
              className="bg-muted cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground">
              O email não pode ser alterado
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

          <div className="space-y-2">
            <Label htmlFor="timezone">Fuso Horário</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger id="timezone">
                <SelectValue placeholder="Selecione o fuso horário" />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Define como as datas são exibidas na aplicação
            </p>
          </div>

          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Senha</Label>
              {profile.hasPassword && (
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                  Protegido
                </span>
              )}
            </div>

            {profile.hasPassword && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="removePassword"
                  checked={removePassword}
                  onChange={(e) => {
                    setRemovePassword(e.target.checked);
                    if (e.target.checked) {
                      setPassword("");
                      setConfirmPassword("");
                    }
                  }}
                  className="rounded border-input"
                />
                <Label htmlFor="removePassword" className="text-sm font-normal cursor-pointer">
                  Remover proteção por senha
                </Label>
              </div>
            )}

            {!removePassword && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="password">
                    {profile.hasPassword ? "Nova Senha" : "Adicionar Senha"}
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={
                      profile.hasPassword
                        ? "Deixe em branco para manter a atual"
                        : "Deixe em branco para não adicionar"
                    }
                  />
                </div>

                {password && (
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirme a nova senha"
                    />
                  </div>
                )}
              </>
            )}
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              <p className="text-sm text-green-500">
                Perfil atualizado com sucesso!
              </p>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
