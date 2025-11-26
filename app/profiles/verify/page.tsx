"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { ArrowLeft, Lock } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"

export default function VerifyPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [profileId, setProfileId] = useState<string | null>(null)
  const [profileName, setProfileName] = useState("")

  useEffect(() => {
    const id = sessionStorage.getItem("selectedProfileId")
    if (!id) {
      router.push("/profiles")
      return
    }
    setProfileId(id)

    fetch("/api/users")
      .then((res) => res.json())
      .then((users) => {
        const profile = users.find((u: { id: string }) => u.id === id)
        if (profile) setProfileName(profile.name)
      })
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!profileId) return

    setError("")
    setLoading(true)

    try {
      const response = await fetch("/api/users/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: profileId, password }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Invalid password")
      }

      const usersResponse = await fetch("/api/users")
      const users = await usersResponse.json()
      const user = users.find((u: { id: string }) => u.id === profileId)

      if (user) {
        sessionStorage.setItem("currentUserId", user.id)
        sessionStorage.setItem(
          "currentUser",
          JSON.stringify({
            id: user.id,
            name: user.name,
            email: user.email,
            avatarColor: user.avatarColor,
          }),
        )
        sessionStorage.removeItem("selectedProfileId")
        router.push("/hub")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid password")
      setPassword("")
    } finally {
      setLoading(false)
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
          onClick={() => {
            sessionStorage.removeItem("selectedProfileId")
            router.push("/profiles")
          }}
          className="mb-6 -ml-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Perfil Protegido</h1>
          <p className="text-muted-foreground">
            Digite a senha para acessar{profileName ? ` o perfil de ${profileName}` : ""}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite sua senha"
              autoFocus
              required
            />
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Verificando..." : "Entrar"}
          </Button>
        </form>
      </Card>
    </div>
  )
}
