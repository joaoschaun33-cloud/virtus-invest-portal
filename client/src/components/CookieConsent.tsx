import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Link } from "wouter";

const CONSENT_KEY = "virtus-cookie-consent-v1";
export type CookieConsentValue = "necessary" | "analytics";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!localStorage.getItem(CONSENT_KEY));
  }, []);

  function save(value: CookieConsentValue) {
    localStorage.setItem(CONSENT_KEY, value);
    window.dispatchEvent(new CustomEvent("virtus:consent", { detail: value }));
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <section
      aria-label="Preferências de privacidade"
      className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-3xl rounded-2xl border bg-background/95 p-4 shadow-2xl backdrop-blur sm:p-5"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">Sua privacidade importa</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Usamos armazenamento essencial para o funcionamento do portal.
            Métricas opcionais só serão ativadas com sua autorização. Leia a
            nossa{" "}
            <Link href="/cookies" className="underline underline-offset-4">
              Política de Cookies
            </Link>
            .
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button variant="outline" onClick={() => save("necessary")}>
            Somente essenciais
          </Button>
          <Button onClick={() => save("analytics")}>Aceitar métricas</Button>
        </div>
      </div>
    </section>
  );
}
