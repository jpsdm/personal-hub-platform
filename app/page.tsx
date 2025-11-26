"use client"

import type React from "react"
import { Wallet, LayoutGrid, TrendingUp, Users } from "lucide-react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

interface AppCard {
  id: string
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  href: string
  available: boolean
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
    id: "futuro-1",
    name: "Em Breve",
    description: "Novo aplicativo em desenvolvimento",
    icon: LayoutGrid,
    href: "#",
    available: false,
  },
  {
    id: "futuro-2",
    name: "Em Breve",
    description: "Novo aplicativo em desenvolvimento",
    icon: TrendingUp,
    href: "#",
    available: false,
  },
  {
    id: "futuro-3",
    name: "Em Breve",
    description: "Novo aplicativo em desenvolvimento",
    icon: Users,
    href: "#",
    available: false,
  },
]

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    router.push("/profiles")
  }, [router])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
        <p className="mt-4 text-muted-foreground">Carregando...</p>
      </div>
    </div>
  )
}
