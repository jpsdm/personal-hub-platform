"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useChat, type UIMessage } from "@ai-sdk/react";
import {
  AlertCircle,
  Bot,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

function formatTime(date: Date): string {
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Componente para renderizar markdown simples
function MessageContent({ content }: { content: string }) {
  // Processar markdown básico
  const processedContent = content
    // Bold: **text**
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    // Bullet points
    .replace(/^• /gm, '<span class="text-primary">•</span> ')
    .replace(/^- /gm, '<span class="text-primary">•</span> ')
    // Numbered lists
    .replace(
      /^(\d+)\. /gm,
      '<span class="text-primary font-medium">$1.</span> '
    );

  return (
    <div
      className="whitespace-pre-wrap text-sm"
      dangerouslySetInnerHTML={{ __html: processedContent }}
    />
  );
}

// Extrair texto das partes da mensagem
function getMessageText(message: UIMessage): string {
  if (!message.parts || message.parts.length === 0) {
    return "";
  }

  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => (part as { type: "text"; text: string }).text)
    .join("");
}

export function AiChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, status, sendMessage, setMessages, error, stop } = useChat();

  const isLoading = status === "submitted" || status === "streaming";

  // Verificar se usuário tem API key configurada
  useEffect(() => {
    if (isOpen && hasApiKey === null) {
      fetch("/api/settings")
        .then((res) => res.json())
        .then((data) => setHasApiKey(data.hasApiKey || false))
        .catch(() => setHasApiKey(false));
    }
  }, [isOpen, hasApiKey]);

  // Scroll para a última mensagem
  useEffect(() => {
    if (scrollRef.current) {
      const scrollElement = scrollRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages, status]);

  const handleClearChat = () => {
    setMessages([]);
    toast.success("Conversa limpa!");
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Se está carregando, cancela o prompt
    if (isLoading) {
      stop();
      toast.info("Geração cancelada");
      return;
    }

    // Caso contrário, envia a mensagem
    if (!input.trim()) return;

    sendMessage({ text: input });
    setInput("");
  };

  return (
    <>
      {/* Botão flutuante */}
      <Button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg",
          "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700",
          "transition-all duration-300 hover:scale-110 z-50"
        )}
        size="icon"
      >
        <Bot className="h-6 w-6 text-white" />
        <span className="sr-only">Abrir assistente IA</span>

        {/* Indicador de pulsação */}
        <span className="absolute -top-1 -right-1 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-4 w-4 bg-violet-500 items-center justify-center">
            <Sparkles className="h-2.5 w-2.5 text-white" />
          </span>
        </span>
      </Button>

      {/* Sheet do Chat */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent
          className="w-full sm:max-w-md p-0 flex flex-col h-full"
          showClose={false}
        >
          {/* Header - fixo no topo */}
          <SheetHeader className="px-4 py-3 border-b bg-gradient-to-r from-violet-600 to-indigo-600 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Bot className="h-6 w-6 text-white" />
                </div>
                <div>
                  <SheetTitle className="text-white text-left">
                    Assistente Financeiro
                  </SheetTitle>
                  <p className="text-xs text-white/70">
                    Powered by GPT-4o •{" "}
                    {hasApiKey ? (
                      <span className="text-green-300">Online</span>
                    ) : (
                      <span className="text-yellow-300">
                        API não configurada
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClearChat}
                  className="text-white/70 hover:text-white hover:bg-white/20 h-8 w-8"
                  title="Limpar conversa"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="text-white hover:bg-white/20 h-8 w-8"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </SheetHeader>

          {/* Área de mensagens - com scroll */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full" ref={scrollRef}>
              <div className="p-4 space-y-4">
                {/* Aviso se não tiver API key */}
                {hasApiKey === false && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-sm">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-yellow-600 dark:text-yellow-400">
                          API Key não configurada
                        </p>
                        <p className="text-muted-foreground mt-1">
                          Para usar o assistente, configure sua chave da OpenAI
                          nas Configurações (ícone de engrenagem no header).
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Mensagem de boas-vindas se não houver mensagens */}
                {messages.length === 0 && hasApiKey !== false && (
                  <div className="flex gap-3">
                    <Avatar className="h-8 w-8 shrink-0 bg-gradient-to-r from-violet-600 to-indigo-600">
                      <AvatarFallback className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white">
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col max-w-[85%] items-start">
                      <div className="rounded-2xl px-4 py-2 bg-muted rounded-bl-md">
                        <MessageContent
                          content={`Olá! 👋 Sou seu assistente financeiro com IA. Posso te ajudar a:\n\n• 📊 Analisar seus gastos e receitas\n• 💰 Verificar saldos das suas contas\n• 📈 Mostrar evolução ao longo dos meses\n• 🏷️ Buscar transações por categoria ou tag\n• 💡 Dar dicas personalizadas\n• ➕ Criar novas receitas e despesas\n\nComo posso te ajudar hoje?`}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-1 px-1">
                        {formatTime(new Date())}
                      </span>
                    </div>
                  </div>
                )}

                {/* Mensagens */}
                {messages.map((message) => {
                  const textContent = getMessageText(message);
                  if (!textContent) return null;

                  return (
                    <div
                      key={message.id}
                      className={cn(
                        "flex gap-3",
                        message.role === "user"
                          ? "flex-row-reverse"
                          : "flex-row"
                      )}
                    >
                      <Avatar
                        className={cn(
                          "h-8 w-8 shrink-0",
                          message.role === "assistant"
                            ? "bg-gradient-to-r from-violet-600 to-indigo-600"
                            : "bg-primary"
                        )}
                      >
                        <AvatarFallback
                          className={cn(
                            message.role === "assistant"
                              ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white"
                              : "bg-primary text-primary-foreground"
                          )}
                        >
                          {message.role === "assistant" ? (
                            <Bot className="h-4 w-4" />
                          ) : (
                            <User className="h-4 w-4" />
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={cn(
                          "flex flex-col max-w-[85%]",
                          message.role === "user" ? "items-end" : "items-start"
                        )}
                      >
                        <div
                          className={cn(
                            "rounded-2xl px-4 py-2",
                            message.role === "user"
                              ? "bg-primary text-primary-foreground rounded-br-md"
                              : "bg-muted rounded-bl-md"
                          )}
                        >
                          <MessageContent content={textContent} />
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-1 px-1">
                          {formatTime(new Date())}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* Indicador de carregamento */}
                {isLoading && (
                  <div className="flex gap-3">
                    <Avatar className="h-8 w-8 shrink-0 bg-gradient-to-r from-violet-600 to-indigo-600">
                      <AvatarFallback className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white">
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                        <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                        <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce"></span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Erro */}
                {error && (
                  <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-destructive">
                          Erro ao processar mensagem
                        </p>
                        <p className="text-muted-foreground mt-1">
                          {error.message || "Tente novamente."}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Remove last assistant message and retry
                            const userMessages = messages.filter(
                              (m) => m.role === "user"
                            );
                            if (userMessages.length > 0) {
                              const lastUserMsg =
                                userMessages[userMessages.length - 1];
                              const textPart = lastUserMsg.parts?.find(
                                (p) => p.type === "text"
                              );
                              if (textPart && "text" in textPart) {
                                setMessages(messages.slice(0, -1));
                                sendMessage({ text: textPart.text });
                              }
                            }
                          }}
                          className="mt-2"
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Tentar novamente
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Área fixa na base */}
          <div className="shrink-0 border-t bg-background">
            {/* Sugestões rápidas */}
            <div className="px-4 py-2 border-b">
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {[
                  "Resumo financeiro deste mês",
                  "Quais meus maiores gastos?",
                  "Qual meu saldo atual?",
                  "Evolução dos últimos meses",
                ].map((suggestion) => (
                  <Button
                    key={suggestion}
                    variant="outline"
                    size="sm"
                    className="shrink-0 text-xs rounded-full"
                    onClick={() => handleSuggestionClick(suggestion)}
                    disabled={isLoading}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>

            {/* Campo de input */}
            <form onSubmit={onSubmit} className="p-4">
              <div className="flex gap-2">
                <Input
                  placeholder={
                    hasApiKey === false
                      ? "Configure a API Key primeiro..."
                      : "Digite sua pergunta..."
                  }
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="flex-1 rounded-full"
                  disabled={isLoading || hasApiKey === false}
                />
                <Button
                  type="submit"
                  disabled={
                    (!input.trim() && !isLoading) || hasApiKey === false
                  }
                  size="icon"
                  className={cn(
                    "rounded-full",
                    isLoading
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700"
                  )}
                  title={isLoading ? "Cancelar geração" : "Enviar mensagem"}
                >
                  {isLoading ? (
                    <X className="h-4 w-4" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground text-center mt-2">
                IA pode cometer erros. Verifique informações importantes.
              </p>
            </form>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
