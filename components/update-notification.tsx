"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { VersionInfo } from "@/lib/version";
import { ArrowUpCircle, ExternalLink, RefreshCw, X } from "lucide-react";
import { useEffect, useState } from "react";

const UPDATE_CHECK_INTERVAL = 60 * 60 * 1000; // 1 hour
const DISMISSED_KEY = "update-notification-dismissed";

export function UpdateNotification() {
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  const checkForUpdates = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/version");
      if (response.ok) {
        const data: VersionInfo = await response.json();
        setVersionInfo(data);

        // Check if this version was already dismissed
        const dismissed = localStorage.getItem(DISMISSED_KEY);
        if (data.hasUpdate && dismissed !== data.latestVersion) {
          setShowBanner(true);
        }
      }
    } catch (error) {
      console.error("Failed to check for updates:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check on mount
    checkForUpdates();

    // Check periodically
    const interval = setInterval(checkForUpdates, UPDATE_CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  const handleDismiss = () => {
    if (versionInfo?.latestVersion) {
      localStorage.setItem(DISMISSED_KEY, versionInfo.latestVersion);
    }
    setShowBanner(false);
  };

  const handleViewDetails = () => {
    setShowDialog(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  if (!showBanner || !versionInfo?.hasUpdate) {
    return null;
  }

  return (
    <>
      {/* Banner de notificação */}
      <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-300">
        <div className="bg-primary text-primary-foreground rounded-lg shadow-lg p-4">
          <div className="flex items-start gap-3">
            <ArrowUpCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">Atualização disponível!</p>
              <p className="text-xs opacity-90 mt-1">
                Versão {versionInfo.latestVersion} está disponível.
                <br />
                Você está usando a versão {versionInfo.currentVersion}.
              </p>
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-7 text-xs"
                  onClick={handleViewDetails}
                >
                  Ver detalhes
                </Button>
                {versionInfo.releaseUrl && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-7 text-xs"
                    asChild
                  >
                    <a
                      href={versionInfo.releaseUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      GitHub
                    </a>
                  </Button>
                )}
              </div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 -mt-1 -mr-1 hover:bg-primary-foreground/20"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Dialog com detalhes da release */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpCircle className="h-5 w-5 text-primary" />
              Nova versão disponível
            </DialogTitle>
            <DialogDescription>
              {versionInfo.releaseName || `Versão ${versionInfo.latestVersion}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Atual:</span>
                <Badge variant="outline">{versionInfo.currentVersion}</Badge>
              </div>
              <span className="text-muted-foreground">→</span>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Nova:</span>
                <Badge variant="default">{versionInfo.latestVersion}</Badge>
              </div>
            </div>

            {versionInfo.publishedAt && (
              <p className="text-sm text-muted-foreground">
                Publicada em {formatDate(versionInfo.publishedAt)}
              </p>
            )}

            {versionInfo.releaseNotes && (
              <div>
                <p className="text-sm font-medium mb-2">Notas da versão:</p>
                <ScrollArea className="h-[200px] rounded-md border p-4">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <pre className="whitespace-pre-wrap text-sm font-sans">
                      {versionInfo.releaseNotes}
                    </pre>
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Fechar
            </Button>
            {versionInfo.releaseUrl && (
              <Button asChild>
                <a
                  href={versionInfo.releaseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ver no GitHub
                </a>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Componente para exibir versão atual no footer ou settings
export function VersionBadge({ showCheck = false }: { showCheck?: boolean }) {
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const checkForUpdates = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/version");
      if (response.ok) {
        const data = await response.json();
        setVersionInfo(data);
      }
    } catch (error) {
      console.error("Failed to check for updates:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkForUpdates();
  }, []);

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span>v{versionInfo?.currentVersion || "..."}</span>
      {versionInfo?.hasUpdate && (
        <Badge
          variant="default"
          className="text-[10px] px-1.5 py-0 h-4 cursor-pointer"
          onClick={() => {
            if (versionInfo.releaseUrl) {
              window.open(versionInfo.releaseUrl, "_blank");
            }
          }}
        >
          Atualização disponível
        </Badge>
      )}
      {showCheck && (
        <Button
          size="icon"
          variant="ghost"
          className="h-5 w-5"
          onClick={checkForUpdates}
          disabled={loading}
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
        </Button>
      )}
    </div>
  );
}
