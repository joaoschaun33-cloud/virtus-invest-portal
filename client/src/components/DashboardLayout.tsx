import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { startLogin } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import {
  Activity,
  Bell,
  BookOpen,
  ChartNoAxesCombined,
  Calculator,
  GitCompareArrows,
  LayoutDashboard,
  LogOut,
  Newspaper,
  FileCheck2,
  PanelLeft,
  Radar,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { VirtusBrand } from "./VirtusBrand";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

const menuItems = [
  { icon: LayoutDashboard, label: "Visão geral", path: "/" },
  { icon: BookOpen, label: "Guia do iniciante", path: "/guia" },
  { icon: ChartNoAxesCombined, label: "Análise fundamentalista", path: "/analise" },
  { icon: Activity, label: "Mercados", path: "/markets" },
  { icon: Radar, label: "Screener", path: "/screener" },
  { icon: GitCompareArrows, label: "Comparar", path: "/compare" },
  { icon: WalletCards, label: "Carteira", path: "/portfolio" },
  { icon: Calculator, label: "Calculadoras", path: "/calculators" },
  { icon: Newspaper, label: "Notícias", path: "/news" },
  { icon: Bell, label: "Alertas", path: "/alerts" },
  { icon: ShieldCheck, label: "Confiança & dados", path: "/trust" },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

export default function DashboardLayout({
  children,
  allowAnonymous = false,
}: {
  children: React.ReactNode;
  allowAnonymous?: boolean;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth({
    // Public content must paint before the optional Firebase iframe starts.
    initializationDelayMs: allowAnonymous ? 2_500 : 0,
  });
  const [loginEmail, setLoginEmail] = useState("");
  const [sendingLink, setSendingLink] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  async function requestEmailLink() {
    const normalized = loginEmail.trim().toLowerCase();
    if (!normalized.includes("@")) {
      setEmailError("Informe um e-mail válido.");
      toast.error("Informe um e-mail válido.");
      return;
    }
    setEmailError(null);
    setSendingLink(true);
    try {
      const { sendEmailLoginLink } = await import("@/lib/firebaseAuth");
      await sendEmailLoginLink(normalized);
      toast.success("Link de acesso enviado. Verifique seu e-mail.");
    } catch {
      toast.error("Não foi possível enviar o link. Tente novamente.");
    } finally {
      setSendingLink(false);
    }
  }

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  // Anonymous pages can render immediately. Waiting for Firebase here replaced
  // the whole viewport with a structurally different skeleton and caused a
  // large layout shift when authentication initialization completed.
  if (loading && !allowAnonymous) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user && !allowAnonymous) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="glass-panel flex w-full max-w-md flex-col items-center gap-7 p-8 text-center sm:p-10">
          <VirtusBrand
            variant="symbol"
            className="h-14 w-14 rounded-2xl shadow-lg shadow-primary/20"
          />
          <div className="space-y-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              Entre para continuar
            </h1>
            <p className="text-sm leading-6 text-muted-foreground">
              Acesse seus favoritos, carteira manual e alertas de preço.
            </p>
          </div>
          <Button
            onClick={() => startLogin()}
            size="lg"
            className="w-full rounded-xl"
          >
            Entrar com Google
          </Button>
          <div className="flex w-full items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            ou use seu e-mail
            <span className="h-px flex-1 bg-border" />
          </div>
          <div className="w-full space-y-3">
            <div className="space-y-2">
              <Input
                type="email"
                autoComplete="email"
                aria-label="E-mail para receber link de acesso"
                aria-invalid={emailError ? "true" : "false"}
                aria-describedby={emailError ? "email-error" : undefined}
                placeholder="voce@exemplo.com.br"
                value={loginEmail}
                onChange={event => {
                  setLoginEmail(event.target.value);
                  if (emailError) setEmailError(null);
                }}
                onKeyDown={event => {
                  if (event.key === "Enter") void requestEmailLink();
                }}
                className={`h-11 rounded-xl ${emailError ? "border-destructive focus-visible:ring-destructive" : ""}`}
              />
              {emailError && (
                <p id="email-error" className="text-sm text-destructive text-left">
                  {emailError}
                </p>
              )}
            </div>
            <Button
              variant="outline"
              className="w-full rounded-xl"
              onClick={requestEmailLink}
              disabled={sendingLink}
            >
              {sendingLink ? "Enviando…" : "Receber link de acesso"}
            </Button>
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            A Virtus nunca solicitará senha bancária, código ou transferência.
          </p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent
        sidebarWidth={sidebarWidth}
        setSidebarWidth={setSidebarWidth}
      >
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  sidebarWidth: number;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  sidebarWidth,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const visibleMenuItems = user?.role === "admin"
    ? [...menuItems, { icon: FileCheck2, label: "Operação editorial", path: "/editorial" }]
    : menuItems;
  const activeMenuItem = visibleMenuItems.find(item => item.path === location);
  const isMobile = useIsMobile();
  const accountLabel = user
    ? user.name ||
      (user.role === "admin" ? "Administrador Virtus" : "Conta Virtus")
    : "Visitante";

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-16 justify-center">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Abrir ou fechar navegação"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed ? (
                <VirtusBrand
                  variant="wordmark"
                  className="h-7 w-[118px] min-w-0"
                />
              ) : (
                <VirtusBrand variant="symbol" className="h-8 w-8" />
              )}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0">
            <SidebarMenu className="px-2 py-1">
              {visibleMenuItems.map(item => {
                const isActive = location === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className={`h-10 transition-all font-normal`}
                    >
                      <item.icon
                        className={`h-4 w-4 ${isActive ? "text-primary" : ""}`}
                      />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 border shrink-0">
                    <AvatarFallback className="text-xs font-medium">
                      {accountLabel.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none">
                      {accountLabel}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-1.5">
                      {user?.email || "Acesso público"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {user ? (
                  <DropdownMenuItem
                    onClick={logout}
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sair</span>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={() => setLocation("/portfolio")}
                    className="cursor-pointer"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Entrar ou criar conta</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          role="separator"
          aria-label="Redimensionar menu lateral"
          aria-orientation="vertical"
          aria-valuemin={MIN_WIDTH}
          aria-valuemax={MAX_WIDTH}
          aria-valuenow={sidebarWidth}
          tabIndex={isCollapsed ? -1 : 0}
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          onKeyDown={event => {
            if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
              event.preventDefault();
              const direction = event.key === "ArrowLeft" ? -1 : 1;
              setSidebarWidth(
                Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, sidebarWidth + direction * 16))
              );
            }
            if (event.key === "Home") setSidebarWidth(MIN_WIDTH);
            if (event.key === "End") setSidebarWidth(MAX_WIDTH);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <span className="tracking-tight text-foreground">
                {activeMenuItem?.label ?? "Menu"}
              </span>
            </div>
          </div>
        )}
        <main className="flex-1 p-4">{children}</main>
      </SidebarInset>
    </>
  );
}
