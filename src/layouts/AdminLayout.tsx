import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardMobileTopbar } from "@/components/dashboard/DashboardMobileTopbar";
import { DashboardBottomNav } from "@/components/dashboard/DashboardBottomNav";
import { DashboardMoreDrawer } from "@/components/dashboard/DashboardMoreDrawer";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, Users, Ticket, DollarSign, Settings, Shield, LogOut, Bell, ArrowLeft, CreditCard, ScrollText, Clock, Trophy, Crown,
} from "lucide-react";
import bateuLogo from "@/assets/bateu-logo.png";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, SidebarHeader, useSidebar,
} from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";

const items = [
  { title: "Overview", url: "/admin", icon: LayoutDashboard },
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Raffles", url: "/admin/raffles", icon: Ticket },
  { title: "Contests", url: "/admin/contests", icon: Trophy },
  { title: "Payments", url: "/admin/payments", icon: CreditCard },
  { title: "Revenue", url: "/admin/revenue", icon: DollarSign },
  { title: "Audit Logs", url: "/admin/audit", icon: ScrollText },
  { title: "Cron Jobs", url: "/admin/cron", icon: Clock },
  { title: "Settings", url: "/admin/settings", icon: Settings },
];

const superadminItems = [
  { title: "Co-founders", url: "/admin/co-founders", icon: Crown },
];

function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, role, signOut } = useAuth();

  const isActive = (path: string) =>
    path === "/admin" ? location.pathname === "/admin" : location.pathname.startsWith(path);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-border px-4 py-4">
        <a href="/" className="flex items-center gap-2">
          <img src={bateuLogo} alt="Bateu" className="h-8 w-8 shrink-0" />
          {!collapsed && (
            <span className="font-display text-lg font-bold text-foreground">Bateu Admin</span>
          )}
        </a>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Administração</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} end={item.url === "/admin"}
                      className="hover:bg-muted/50" activeClassName="bg-destructive/10 text-destructive font-medium">
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {role === "superadmin" && (
          <SidebarGroup>
            <SidebarGroupLabel>Co-founder</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {superadminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <NavLink to={item.url} className="hover:bg-muted/50" activeClassName="bg-primary/10 text-primary font-medium">
                        <item.icon className="mr-2 h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/dashboard" className="hover:bg-muted/50" activeClassName="">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {!collapsed && <span>Voltar ao Dashboard</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destructive/20 text-destructive text-sm font-bold">
            {(profile?.display_name || "A").charAt(0).toUpperCase()}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{profile?.display_name || "Admin"}</p>
              <p className="text-xs text-muted-foreground">Administrador</p>
            </div>
          )}
          {!collapsed && (
            <button onClick={async () => { await signOut(); navigate("/"); }} className="text-muted-foreground hover:text-foreground">
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

export default function AdminLayout() {
  const [drawer, setDrawer] = useState(false);
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <div className="hidden lg:block"><AdminSidebar /></div>
        <div className="flex-1 flex flex-col min-w-0">
          <header className="hidden lg:flex h-14 items-center justify-between border-b border-border px-3 sm:px-4 glass-strong">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              <span className="text-sm text-muted-foreground hidden sm:inline">Painel de Administração</span>
            </div>
            <div className="flex items-center gap-3">
              <button className="relative text-muted-foreground hover:text-foreground">
                <Bell className="h-5 w-5" />
              </button>
            </div>
          </header>
          <DashboardMobileTopbar onOpenDrawer={() => setDrawer(true)} variant="admin" />
          <main className="flex-1 overflow-auto p-3 sm:p-6 pb-28 lg:pb-6">
            <Outlet />
          </main>
        </div>
      </div>
      <DashboardBottomNav onMore={() => setDrawer(true)} variant="admin" />
      <DashboardMoreDrawer open={drawer} onOpenChange={setDrawer} variant="admin" />
    </SidebarProvider>
  );
}
