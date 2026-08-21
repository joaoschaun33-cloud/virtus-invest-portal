import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { BarChart3, BellRing, BriefcaseBusiness, Calculator, GitCompareArrows, LayoutDashboard, ListFilter, Newspaper, Search, ShieldCheck, Sparkles } from "lucide-react";
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

const navigation = [
  { label: "Visão geral", path: "/", icon: LayoutDashboard, shortcut: "G H" },
  { label: "Mercados", path: "/markets", icon: BarChart3, shortcut: "G M" },
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
  const [search, setSearch] = useState("");
  const input = useMemo(() => ({ search: search.trim() || undefined }), [search]);
  const assetsQuery = trpc.market.assets.useQuery(input, { staleTime: 30_000 });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onOpenChange, open]);

  const navigate = (path: string) => {
    onOpenChange(false);
    setSearch("");
    setLocation(path);
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Buscar no Virtus"
      description="Encontre ativos e navegue pelo workspace analítico."
      className="overflow-hidden rounded-2xl border-border/70 bg-card/95 shadow-2xl backdrop-blur-xl sm:max-w-xl"
    >
      <CommandInput value={search} onValueChange={setSearch} placeholder="Buscar ativo, página ou comando..." />
      <CommandList className="max-h-[min(480px,65vh)] p-2">
        <CommandEmpty>Nenhum ativo ou destino encontrado.</CommandEmpty>
        <CommandGroup heading="Navegação">
          {navigation.map(({ label, path, icon: Icon, shortcut }) => (
            <CommandItem key={path} value={label} onSelect={() => navigate(path)} className="rounded-xl px-3 py-3">
              <Icon className="h-4 w-4" />
              <span>{label}</span>
              {shortcut && <CommandShortcut>{shortcut}</CommandShortcut>}
            </CommandItem>
          ))}
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
        <CommandGroup heading="Ações rápidas">
          <CommandItem value="modo demonstração transparência" onSelect={() => navigate("/news")} className="rounded-xl px-3 py-3">
            <Sparkles className="h-4 w-4 text-primary" />
            <span>Ver origem dos dados e avisos editoriais</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
