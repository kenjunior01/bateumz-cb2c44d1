import {
  LayoutDashboard,
  Ticket,
  BarChart3,
  Users,
  Settings,
  Gift,
  Bell,
  LogOut,
  Palette,
  Zap,
} from "lucide-react";
import bateuLogo from "@/assets/bateu-logo.png";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";

const mainItems = [
  { title: "Painel Geral", url: "/dashboard", icon: LayoutDashboard },
  { title: "Meus Sorteios", url: "/dashboard/raffles", icon: Ticket },
  { title: "Analíticas", url: "/dashboard/analytics", icon: BarChart3 },
  { title: "Analíticas Sociais", url: "/dashboard/social-analytics", icon: Zap },
  { title: "Participantes", url: "/dashboard/participants", icon: Users },
  { title: "Prémios", url: "/dashboard/prizes", icon: Gift },
  { title: "White Label", url: "/dashboard/white-label", icon: Palette },
];

const secondaryItems = [
  { title: "Notificações", url: "/dashboard/notifications", icon: Bell },
  { title: "Configurações", url: "/dashboard/settings", icon: Settings },
];

export function DashboardSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const { profile, signOut } = useAuth();

  const isActive = (path: string) =>
    path === "/dashboard"
      ? currentPath === "/dashboard"
      : currentPath.startsWith(path);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-border px-4 py-4">
        <a href="/" className="flex items-center gap-2">
          <img src={bateuLogo} alt="Bateu" className="h-8 w-8 shrink-0" />
          {!collapsed && (
            <span className="font-display text-lg font-bold text-foreground">
              Bateu
            </span>
          )}
        </a>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                  >
                    <NavLink
                      to={item.url}
                      end={item.url === "/dashboard"}
                      className="hover:bg-muted/50"
                      activeClassName="bg-primary/10 text-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Sistema</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {secondaryItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                  >
                    <NavLink
                      to={item.url}
                      className="hover:bg-muted/50"
                      activeClassName="bg-primary/10 text-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary text-sm font-bold">
            {(profile?.display_name || "E").charAt(0).toUpperCase()}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {profile?.display_name || "Empresa"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {profile?.company_name || "Plano Business"}
              </p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={async () => { await signOut(); navigate("/"); }}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
