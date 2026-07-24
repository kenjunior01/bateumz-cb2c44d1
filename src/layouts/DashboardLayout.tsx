import { Outlet } from "react-router-dom";
import { useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardMobileTopbar } from "@/components/dashboard/DashboardMobileTopbar";
import { DashboardBottomNav } from "@/components/dashboard/DashboardBottomNav";
import { DashboardFab } from "@/components/dashboard/DashboardFab";
import { DashboardMoreDrawer } from "@/components/dashboard/DashboardMoreDrawer";

export default function DashboardLayout() {
  const [drawer, setDrawer] = useState(false);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <div className="hidden lg:block"><DashboardSidebar /></div>
        <div className="flex-1 flex flex-col min-w-0">
          <DashboardMobileTopbar onOpenDrawer={() => setDrawer(true)} />
          <main className="flex-1 overflow-auto p-3 sm:p-6 pb-28 lg:pb-6">
            <Outlet />
          </main>
        </div>
      </div>
      <DashboardBottomNav onMore={() => setDrawer(true)} />
      <DashboardFab />
      <DashboardMoreDrawer open={drawer} onOpenChange={setDrawer} />
    </SidebarProvider>
  );
}
