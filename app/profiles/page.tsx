"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
  hasPassword: boolean;
}

export default function ProfilesPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [profileToDelete, setProfileToDelete] = useState<UserProfile | null>(
    null
  );
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    loadProfiles();
  }, []);

  async function loadProfiles() {
    try {
      const response = await fetch("/api/users");
      if (response.ok) {
        const data = await response.json();
        setProfiles(data);
      }
    } catch (error) {
      console.error("Error loading profiles:", error);
    } finally {
      setLoading(false);
    }
  }

  function handleProfileSelect(profile: UserProfile) {
    if (profile.hasPassword) {
      sessionStorage.setItem("selectedProfileId", profile.id);
      router.push("/profiles/verify");
    } else {
      sessionStorage.setItem("currentUserId", profile.id);
      sessionStorage.setItem(
        "currentUser",
        JSON.stringify({
          id: profile.id,
          name: profile.name,
          email: profile.email,
          avatarColor: profile.avatarColor,
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
          profile.id
        )}; ${cookieOptions}`;
      } catch (e) {
        // non-fatal: cookie failed to set in unusual environments
        // eslint-disable-next-line no-console
        console.warn("Failed to set cookie for currentUserId", e);
      }

      router.push("/hub");
    }
  }

  function handleAddProfile() {
    router.push("/profiles/create");
  }

  function openDeleteDialog(e: React.MouseEvent, profile: UserProfile) {
    e.stopPropagation(); // Prevent profile selection
    setProfileToDelete(profile);
    setDeleteConfirmation("");
    setDeleteError("");
    setDeleteDialogOpen(true);
  }

  function closeDeleteDialog() {
    setDeleteDialogOpen(false);
    setProfileToDelete(null);
    setDeleteConfirmation("");
    setDeleteError("");
  }

  async function handleDeleteProfile() {
    if (!profileToDelete) return;

    if (deleteConfirmation !== "DELETAR") {
      setDeleteError("Digite DELETAR para confirmar");
      return;
    }

    setDeleting(true);
    setDeleteError("");

    try {
      const response = await fetch(`/api/users/${profileToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Falha ao excluir perfil");
      }

      // Remove from local state
      setProfiles(profiles.filter((p) => p.id !== profileToDelete.id));
      closeDeleteDialog();
    } catch (error) {
      console.error("Error deleting profile:", error);
      setDeleteError(
        error instanceof Error ? error.message : "Erro ao excluir perfil"
      );
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground">Carregando perfis...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="fixed top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-5xl">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-foreground mb-2">
            Quem está usando?
          </h1>
          <p className="text-muted-foreground">
            Selecione seu perfil para continuar
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
          {profiles.map((profile) => (
            <div key={profile.id} className="relative group">
              <button
                onClick={() => handleProfileSelect(profile)}
                className="w-full flex flex-col items-center gap-3 p-4 rounded-lg hover:bg-accent transition-colors"
              >
                <div
                  className="w-32 h-32 rounded-lg flex items-center justify-center text-white text-4xl font-bold group-hover:ring-4 group-hover:ring-primary/50 transition-all"
                  style={{ backgroundColor: profile.avatarColor }}
                >
                  {profile.name.charAt(0).toUpperCase()}
                </div>
                <div className="text-center">
                  <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                    {profile.name}
                  </p>
                  {profile.hasPassword && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Protegido
                    </p>
                  )}
                </div>
              </button>
              <button
                onClick={(e) => openDeleteDialog(e, profile)}
                className="absolute top-2 right-2 p-2 rounded-full bg-background/80 opacity-0 group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground transition-all"
                title="Excluir perfil"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          <button
            onClick={handleAddProfile}
            className="group flex flex-col items-center gap-3 p-4 rounded-lg hover:bg-accent transition-colors"
          >
            <div className="w-32 h-32 rounded-lg border-2 border-dashed border-border group-hover:border-primary flex items-center justify-center transition-colors">
              <Plus className="w-12 h-12 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <p className="font-medium text-muted-foreground group-hover:text-primary transition-colors">
              Adicionar Perfil
            </p>
          </button>
        </div>

        {profiles.length === 0 && (
          <div className="text-center mt-8">
            <p className="text-muted-foreground mb-4">
              Nenhum perfil encontrado. Crie seu primeiro perfil!
            </p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Perfil</DialogTitle>
            <DialogDescription>
              Você está prestes a excluir o perfil{" "}
              <strong>{profileToDelete?.name}</strong>. Esta ação é irreversível
              e todos os dados associados serão perdidos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="delete-confirmation">
                Digite <strong className="text-destructive">DELETAR</strong>{" "}
                para confirmar
              </Label>
              <Input
                id="delete-confirmation"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder="DELETAR"
                className="font-mono"
              />
            </div>

            {deleteError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive">{deleteError}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeDeleteDialog}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteProfile}
              disabled={deleting || deleteConfirmation !== "DELETAR"}
            >
              {deleting ? "Excluindo..." : "Excluir Perfil"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
