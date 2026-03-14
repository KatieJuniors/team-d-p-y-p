import { 
  BarChart3, 
  Package, 
  Tags, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  ArrowRightLeft, 
  Settings,
  History,
  LogOut,
  Warehouse,
  Boxes
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";

export function AppSidebar() {
  const [location] = useLocation();
  const { logout, user } = useAuth();
  
  const isManager = user?.role === "manager";

  return (
    <Sidebar className="border-r border-border/50 bg-card/50 backdrop-blur-xl">
      <SidebarHeader className="h-16 flex items-center px-4">
        <Link href="/dashboard" className="flex items-center gap-3 font-display font-bold text-xl text-primary">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/25">
            <Boxes className="w-5 h-5 text-white" />
          </div>
          CORE<span className="text-foreground">INV</span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4 gap-6">
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground font-semibold">Overview</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={location === "/dashboard"}>
                <Link href="/dashboard" className="transition-all hover:text-primary">
                  <BarChart3 className="w-4 h-4" />
                  <span>Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground font-semibold">Inventory</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={location.startsWith("/products")}>
                <Link href="/products" className="transition-all hover:text-primary">
                  <Package className="w-4 h-4" />
                  <span>Products</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            {isManager && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.startsWith("/categories")}>
                  <Link href="/categories" className="transition-all hover:text-primary">
                    <Tags className="w-4 h-4" />
                    <span>Categories</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground font-semibold">Operations</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={location.startsWith("/operations/receipts")}>
                <Link href="/operations/receipts" className="transition-all hover:text-primary">
                  <ArrowDownToLine className="w-4 h-4" />
                  <span>Receipts</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={location.startsWith("/operations/deliveries")}>
                <Link href="/operations/deliveries" className="transition-all hover:text-primary">
                  <ArrowUpFromLine className="w-4 h-4" />
                  <span>Deliveries</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={location.startsWith("/operations/transfers")}>
                <Link href="/operations/transfers" className="transition-all hover:text-primary">
                  <ArrowRightLeft className="w-4 h-4" />
                  <span>Internal Transfers</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={location.startsWith("/operations/history")}>
                <Link href="/operations/history" className="transition-all hover:text-primary">
                  <History className="w-4 h-4" />
                  <span>Stock Ledger</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {isManager && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-muted-foreground font-semibold">Settings</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.startsWith("/settings/warehouses")}>
                  <Link href="/settings/warehouses" className="transition-all hover:text-primary">
                    <Warehouse className="w-4 h-4" />
                    <span>Warehouses & Locations</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-border/50">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center font-bold text-sm text-primary">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold leading-tight">{user?.name}</span>
            <span className="text-xs text-muted-foreground leading-tight capitalize">{user?.role}</span>
          </div>
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={logout} className="text-destructive hover:text-destructive hover:bg-destructive/10">
              <LogOut className="w-4 h-4" />
              <span>Log out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
