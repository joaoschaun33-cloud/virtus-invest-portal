import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  BarChart3,
  BellRing,
  BookOpen,
  BriefcaseBusiness,
  Calculator,
  ChartNoAxesCombined,
  GitCompareArrows,
  LayoutDashboard,
  ListFilter,
  Newspaper,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Landmark,
  Pause,
  Play,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { trpc } from "@/lib/trpc";
import { useLiveControl } from "@/contexts/LiveControlContext";

const navigation = [
  { label: "Visão geral", path: "/", icon: LayoutDashboard, shortcut: "G H" },
  { label: "Curva de Juros & Macro (ETTJ)", path: "/markets", icon: TrendingUp, shortcut: "G J" },
  { label: "Mercados & Ativos", path: "/markets", icon: BarChart3, shortcut: "G M" },
  { label: "Análise fundamentalista", path: "/analise", icon: ChartNoAxesCombined },
  { label: "Guia do iniciante", path: "/guia", icon: BookOpen },
  { label: "Screener", path: "/screener", icon: ListFilter, shortcut: "G S" },
  { label: "Comparar ativos", path: "/compare", icon: GitCompareArrows },
  { label: "Calculadoras", path: "/calculators", icon: Calculator },
  { label: "Carteira manual", path: "/portfolio", icon: BriefcaseBusiness },
  { label: "Notícias e calendário", path: "/news", icon: Newspaper },
  { label: "Alertas", path: "/alerts", icon: BellRing },
  { label: "Confiança e dados", path: "/trust", icon: ShieldCheck },
];

export default function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [, setLocation] = useLocation();
  const { isLivePaused, toggleLivePause } = useLiveControl();
  const [search, setSearch] = useState("");
  const input = useMemo(() => ({ search: search.trim() || undefined }), [search]);
  const assetsQuery = trpc.market.assets.useQuery(input, { staleTime: 30_000 });

  const navigate = (path: string) => {
    onOpenChange(false);
    setSearch("");
    setLocation(path);
  };

  const handleToggleLive = () => {
    toggleLivePause();
    onOpenChange(false);
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Buscar no Virtus"
      description="Encontre ativos e navegue pelo workspace analítico."
      className="overflow-hidden rounded-2xl border-border/70 bg-card/95 shadow-2xl backdrop-blur-xl sm:max-w-xl"
    >
      <CommandInput value={search} onValueChange={setSearch} placeholder="Buscar ativo, taxa macro ou comando..." />
      <CommandList className="max-h-[min(480px,65vh)] p-2">
        <CommandEmpty>Nenhum ativo ou destino encontrado.</CommandEmpty>
        <CommandGroup heading="Navegação & Cockpits">
          {navigation.map(({ label, path, icon: Icon, shortcut }) => (
            <CommandItem key={label} value={label} onSelect={() => navigate(path)} className="rounded-xl px-3 py-3">
              <Icon className="h-4 w-4" />
              <span>{label}</span>
              {shortcut && <CommandShortcut>{shortcut}</CommandShortcut>}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Macro & Taxas Soberanas">
          <CommandItem value="selic taxa juros banco central" onSelect={() => navigate("/")} className="rounded-xl px-3 py-3">
            <Landmark className="h-4 w-4 text-primary" />
            <span className="font-semibold">Taxa Selic Meta</span>
            <span className="truncate text-muted-foreground">Banco Central do Brasil</span>
            <span className="ml-auto text-[11px] text-muted-foreground">BCB</span>
          </CommandItem>
          <CommandItem value="ipca inflacao ibge 12 meses" onSelect={() => navigate("/")} className="rounded-xl px-3 py-3">
            <Landmark className="h-4 w-4 text-amber-500" />
            <span className="font-semibold">IPCA · Inflação Oficial</span>
            <span className="truncate text-muted-foreground">IBGE e BCB</span>
            <span className="ml-auto text-[11px] text-muted-foreground">12 Meses</span>
          </CommandItem>
          <CommandItem value="curva juros ettj titulos publicos tesouro" onSelect={() => navigate("/markets")} className="rounded-xl px-3 py-3">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            <span className="font-semibold">Curva de Juros Soberana (ETTJ)</span>
            <span className="truncate text-muted-foreground">Tesouro Prefixado & IPCA+</span>
            <span className="ml-auto text-[11px] text-muted-foreground">Tesouro Direto</span>
          </CommandItem>
        </CommandGroup>
        <CommandGroup heading="Ativos">
          {(assetsQuery.data ?? []).slice(0, 12).map((asset) => (
            <CommandItem key={asset.id} value={`${asset.ticker} ${asset.name}`} onSelect={() => navigate(`/asset/${encodeURIComponent(asset.ticker)}`)} className="rounded-xl px-3 py-3">
              <Search className="h-4 w-4" />
              <span className="font-semibold">{asset.ticker}</span>
              <span className="truncate text-muted-foreground">{asset.name}</span>
              <span className="ml-auto text-[11px] text-muted-foreground">{asset.assetType}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Ações do Terminal">
          <CommandItem
            value="pausar congelar retomar cotacoes ao vivo wcag"
            onSelect={handleToggleLive}
            className="rounded-xl px-3 py-3"
          >
            {isLivePaused ? (
              <>
                <Play className="h-4 w-4 text-emerald-500" />
                <span>Retomar cotações em tempo real</span>
              </>
            ) : (
              <>
                <Pause className="h-4 w-4 text-amber-500" />
                <span>Pausar cotações em tempo real (WCAG 2.2.2)</span>
              </>
            )}
            <CommandShortcut>Alt+P</CommandShortcut>
          </CommandItem>
          <CommandItem value="transparência origem dados" onSelect={() => navigate("/news")} className="rounded-xl px-3 py-3">
            <Sparkles className="h-4 w-4 text-primary" />
            <span>Ver procedência oficial dos dados e avisos</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
