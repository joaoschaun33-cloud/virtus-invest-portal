import { PageMetadata } from "@/components/PageMetadata";
import { VirtusBrand } from "@/components/VirtusBrand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { firebaseAuth } from "@/lib/firebaseAuth";
import { isSignInWithEmailLink, signInWithEmailLink } from "firebase/auth";
import { useState } from "react";
import { useLocation } from "wouter";

export default function AuthFinish() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState(
    () => localStorage.getItem("virtus-email-for-sign-in") ?? ""
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function finish() {
    if (!email || !isSignInWithEmailLink(firebaseAuth, window.location.href)) {
      setError("Informe o mesmo e-mail usado para solicitar o acesso.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await signInWithEmailLink(firebaseAuth, email, window.location.href);
      localStorage.removeItem("virtus-email-for-sign-in");
      setLocation("/");
    } catch {
      setError("O link é inválido ou expirou. Solicite um novo acesso.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-10">
      <PageMetadata
        title="Confirmar acesso"
        description="Confirme seu acesso seguro ao Virtus."
        noIndex
      />
      <section className="glass-panel w-full max-w-md p-7 text-center sm:p-10">
        <VirtusBrand variant="wordmark" className="mx-auto h-9 w-36" />
        <h1 className="mt-8 text-2xl font-semibold">Confirmar acesso</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Para sua segurança, confirme o e-mail que recebeu este link.
        </p>
        <Input
          className="mt-6 h-11 rounded-xl"
          type="email"
          autoComplete="email"
          aria-label="E-mail de acesso"
          placeholder="voce@exemplo.com.br"
          value={email}
          onChange={event => setEmail(event.target.value)}
        />
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        <Button
          className="mt-5 w-full rounded-xl"
          onClick={finish}
          disabled={loading}
        >
          {loading ? "Confirmando…" : "Acessar minha conta"}
        </Button>
        <p className="mt-6 text-xs leading-5 text-muted-foreground">
          A Virtus nunca solicitará sua senha, código bancário ou transferência.
        </p>
      </section>
    </main>
  );
}
