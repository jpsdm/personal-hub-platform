"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  Check,
  Eye,
  EyeOff,
  Key,
  Loader2,
  Moon,
  Palette,
  Settings,
  Sun,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface SettingsData {
  hasApiKey: boolean;
  openaiApiKey: string | null;
}

export function SettingsDialog() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      fetchSettings();
    }
  }, [open]);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/settings");
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        setApiKey(data.openaiApiKey || "");
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveApiKey = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openaiApiKey: apiKey }),
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        setApiKey(data.openaiApiKey || "");
        toast.success("Chave da API salva com sucesso!");
      } else {
        toast.error("Erro ao salvar a chave da API");
      }
    } catch (error) {
      console.error("Error saving API key:", error);
      toast.error("Erro ao salvar a chave da API");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveApiKey = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openaiApiKey: null }),
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        setApiKey("");
        toast.success("Chave da API removida com sucesso!");
      } else {
        toast.error("Erro ao remover a chave da API");
      }
    } catch (error) {
      console.error("Error removing API key:", error);
      toast.error("Erro ao remover a chave da API");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Settings className="h-5 w-5" />
          <span className="sr-only">Configurações</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurações
          </DialogTitle>
          <DialogDescription>
            Configure o tema e a integração com IA
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="theme" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="theme" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Tema
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              IA
            </TabsTrigger>
          </TabsList>

          <TabsContent value="theme" className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label>Aparência</Label>
              <p className="text-sm text-muted-foreground">
                Escolha entre tema claro ou escuro
              </p>
            </div>

            {mounted && (
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setTheme("light")}
                  className={cn(
                    "flex flex-col items-center gap-3 rounded-lg border-2 p-4 transition-all hover:bg-accent",
                    theme === "light"
                      ? "border-primary bg-accent"
                      : "border-muted"
                  )}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                    <Sun className="h-6 w-6 text-amber-600" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Claro</span>
                    {theme === "light" && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>
                </button>

                <button
                  onClick={() => setTheme("dark")}
                  className={cn(
                    "flex flex-col items-center gap-3 rounded-lg border-2 p-4 transition-all hover:bg-accent",
                    theme === "dark"
                      ? "border-primary bg-accent"
                      : "border-muted"
                  )}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-800">
                    <Moon className="h-6 w-6 text-slate-200" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Escuro</span>
                    {theme === "dark" && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>
                </button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="ai" className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label>Chave da API OpenAI</Label>
              <p className="text-sm text-muted-foreground">
                Adicione sua chave para usar o assistente de IA. Obtenha sua
                chave em{" "}
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  platform.openai.com
                </a>
              </p>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <div className="relative">
                    <Input
                      type={showApiKey ? "text" : "password"}
                      placeholder="sk-..."
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>

                  {settings?.hasApiKey && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Check className="h-3 w-3 text-green-500" />
                      Chave configurada: {settings.openaiApiKey}
                    </p>
                  )}
                </div>

                <Separator />

                <div className="flex gap-2">
                  <Button
                    onClick={handleSaveApiKey}
                    disabled={
                      isSaving || !apiKey || apiKey.startsWith("sk-...")
                    }
                    className="flex-1"
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Salvar Chave
                  </Button>
                  {settings?.hasApiKey && (
                    <Button
                      variant="destructive"
                      onClick={handleRemoveApiKey}
                      disabled={isSaving}
                    >
                      Remover
                    </Button>
                  )}
                </div>

                <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                  <p className="font-medium mb-1">🔒 Sua chave é segura</p>
                  <p>
                    A chave é armazenada de forma segura e usada apenas para
                    processar suas solicitações ao assistente de IA.
                  </p>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
