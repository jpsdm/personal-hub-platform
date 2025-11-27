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
import { cn } from "@/lib/utils";
import { Check, Moon, Palette, Settings, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function SettingsDialog() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Settings className="h-5 w-5" />
          <span className="sr-only">Configurações</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Aparência
          </DialogTitle>
          <DialogDescription>
            Escolha entre tema claro ou escuro
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
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
                  theme === "dark" ? "border-primary bg-accent" : "border-muted"
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
