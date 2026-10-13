import { useState } from "react";
import { Sparkles, Bot, BookOpen, AlertCircle, X } from "lucide-react";
import { AIChatBox, type Message } from "@/components/AIChatBox";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface EducationalAIAssistantProps {
  ticker?: string;
  triggerLabel?: string;
  variant?: "floating" | "button" | "card";
  className?: string;
}

export function EducationalAIAssistant({
  ticker,
  triggerLabel = "Assistente CVM & Balanços",
  variant = "button",
  className = "",
}: EducationalAIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "system",
      content:
        "Você é o assistente educacional Virtus. Explique termos, demonstrações contábeis e múltiplos segundo as diretrizes da CVM, sem nunca recomendar compra ou venda.",
    },
  ]);

  const defaultSuggestedPrompts = ticker
    ? [
        `Como interpretar o P/L e P/VP de ${ticker}?`,
        `Qual a diferença prática entre ROE e ROIC para ${ticker}?`,
        `Como analisar a Dívida Líquida / EBITDA de ${ticker}?`,
        `Quais as limitações da fórmula de Graham aplicadas a ${ticker}?`,
      ]
    : [
        "Explique a fórmula de Preço Justo de Graham e suas premissas",
        "Como funciona o método de Preço Teto de Décio Bazin?",
        "Qual a diferença entre DRE, Balanço Patrimonial e DFC na CVM?",
        "O que significa margem líquida e como ela impacta o valuation?",
      ];

  const chatMutation = trpc.ai.chat.useMutation({
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.content,
        },
      ]);
    },
    onError: (err) => {
      toast.error("Não foi possível obter resposta do assistente no momento.");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "⚠️ Ocorreu uma oscilação na consulta. Por favor, tente reformular sua dúvida conceitual.",
        },
      ]);
    },
  });

  const handleSendMessage = (content: string) => {
    const updatedMessages: Message[] = [...messages, { role: "user", content }];
    setMessages(updatedMessages);
    chatMutation.mutate({
      messages: updatedMessages,
      ticker,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {variant === "floating" ? (
          <button
            type="button"
            className={`fixed bottom-6 right-6 z-40 flex items-center gap-2.5 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-primary/25 active:scale-95 ${className}`}
            aria-label="Abrir assistente educacional CVM"
          >
            <Sparkles className="h-4 w-4" />
            <span>{triggerLabel}</span>
          </button>
        ) : (
          <Button
            type="button"
            variant="outline"
            className={`inline-flex items-center gap-2 border-primary/30 text-primary hover:bg-primary/10 ${className}`}
          >
            <Sparkles className="h-4 w-4 text-primary" />
            <span>{triggerLabel}</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-3xl overflow-hidden p-0 sm:max-h-[85vh]">
        <div className="border-b border-border/80 bg-muted/30 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold">
                  Assistente Virtus Educação & CVM
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Esclareça conceitos contábeis, demonstrações da CVM e múltiplos fundamentalistas
                </DialogDescription>
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-900 dark:text-amber-300">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              <strong>Fins estritamente didáticos (Resolução CVM nº 20).</strong> O assistente não realiza consultoria ou recomendações de investimento.
            </span>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          <AIChatBox
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={chatMutation.isPending}
            height="520px"
            placeholder={
              ticker
                ? `Tire dúvidas sobre os fundamentos ou balanços de ${ticker}...`
                : "Digite uma dúvida sobre indicadores, múltiplos ou relatórios da CVM..."
            }
            suggestedPrompts={defaultSuggestedPrompts}
            emptyStateMessage={
              ticker
                ? `Olá! Estou pronto para explicar os conceitos contábeis e demonstrativos de ${ticker}.`
                : "Olá! Como posso ajudar em seus estudos sobre análise fundamentalista e mercado de capitais hoje?"
            }
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
