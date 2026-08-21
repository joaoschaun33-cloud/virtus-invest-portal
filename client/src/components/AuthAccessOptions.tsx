import { startLogin } from "@/const";
import { sendEmailLoginLink } from "@/lib/firebaseAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogIn, Mail } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function AuthAccessOptions() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  async function requestLink() {
    const normalized = email.trim().toLowerCase();
    if (!normalized.includes("@")) {
      toast.error("Informe um e-mail válido.");
      return;
    }
    setSending(true);
    try {
      await sendEmailLoginLink(normalized);
      toast.success("Link seguro enviado. Verifique sua caixa de entrada.");
    } catch (error) {
      toast.error("Não foi possível enviar o link de acesso.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="w-full max-w-sm space-y-3">
      <Button className="w-full rounded-xl" onClick={() => startLogin()}>
        <LogIn className="mr-2 h-4 w-4" />
        Entrar com Google
      </Button>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        ou use seu e-mail
        <span className="h-px flex-1 bg-border" />
      </div>
      <Input
        type="email"
        autoComplete="email"
        aria-label="E-mail para receber link de acesso"
        placeholder="voce@exemplo.com.br"
        value={email}
        onChange={event => setEmail(event.target.value)}
        onKeyDown={event => {
          if (event.key === "Enter") void requestLink();
        }}
        className="h-11 rounded-xl"
      />
      <Button
        type="button"
        variant="outline"
        className="w-full rounded-xl"
        onClick={() => void requestLink()}
        disabled={sending}
      >
        <Mail className="mr-2 h-4 w-4" />
        {sending ? "Enviando…" : "Enviar link seguro"}
      </Button>
    </div>
  );
}
