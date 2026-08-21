import { Link } from "wouter";
import { ArrowLeft, SearchX } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { VirtusBrand } from "@/components/VirtusBrand";

export default function NotFound() {
  return (
    <DashboardLayout allowAnonymous>
      <div className="container flex min-h-[70vh] flex-col items-center justify-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border/80 bg-card/60 shadow-sm">
          <VirtusBrand variant="symbol" className="h-8 w-8" />
        </div>
        <div className="mt-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <SearchX className="h-6 w-6" />
        </div>
        <p className="mt-6 text-4xl font-semibold tracking-[-0.05em]">404</p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">Página não encontrada no workspace</h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          O endereço que você acessou não existe ou foi alterado. Retorne ao painel principal para continuar sua análise.
        </p>
        <div className="mt-8">
          <Link href="/">
            <Button className="rounded-xl px-6 py-5 text-sm font-semibold shadow-sm">
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar à visão geral
            </Button>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
