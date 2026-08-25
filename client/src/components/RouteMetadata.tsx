import { PageMetadata } from "@/components/PageMetadata";
import { useLocation } from "wouter";

const metadata: Record<
  string,
  { title: string; description: string; noIndex?: boolean }
> = {
  "/": {
    title: "Mercados e investimentos",
    description:
      "Acompanhe mercados, ativos, notícias e sua carteira manual com clareza sobre fontes e atualização dos dados.",
  },
  "/markets": {
    title: "Mercados",
    description:
      "Consulte ativos, cotações e indicadores com identificação da fonte e do horário de atualização.",
  },
  "/news": {
    title: "Notícias",
    description:
      "Notícias e contexto para acompanhar os acontecimentos relevantes dos mercados.",
  },
  "/screener": {
    title: "Screener de ativos",
    description:
      "Explore e filtre ativos por classe e indicadores para apoiar sua pesquisa.",
  },
  "/compare": {
    title: "Comparador de ativos",
    description:
      "Compare ativos e indicadores em uma mesma visão, com transparência sobre os dados.",
  },
  "/calculators": {
    title: "Calculadoras financeiras",
    description:
      "Simule juros compostos, renda passiva e cenários financeiros para fins educacionais.",
  },
  "/guia": {
    title: "Guia do iniciante",
    description:
      "Aprenda os conceitos essenciais de investimentos e conheça as ferramentas do Virtus no seu ritmo.",
  },
  "/portfolio": {
    title: "Carteira",
    description: "Organize e acompanhe sua carteira manual no Virtus.",
    noIndex: true,
  },
  "/alerts": {
    title: "Alertas",
    description: "Configure e acompanhe alertas pessoais de mercado.",
    noIndex: true,
  },
  "/trust": {
    title: "Confiança e dados",
    description:
      "Conheça as fontes, limitações, atualização e princípios de transparência do Virtus.",
  },
};

export function RouteMetadata() {
  const [location] = useLocation();
  if (["/privacy", "/terms", "/cookies", "/auth/finish"].includes(location))
    return null;
  const value = location.startsWith("/asset/")
    ? {
        title: `Ativo ${location.split("/").pop()?.toUpperCase()}`,
        description:
          "Cotação, histórico e indicadores do ativo, com fonte e horário de atualização.",
      }
    : (metadata[location] ?? {
        title: "Página não encontrada",
        description: "A página solicitada não foi encontrada.",
        noIndex: true,
      });
  return <PageMetadata {...value} />;
}
