import { Home, Tag, Building2, PiggyBank, Repeat, Target, BarChart3, Moon, Sun, Coins } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
  SidebarFooter,
} from "@/components/ui/sidebar";

const items = [
  { title: "Dashboard", url: "/dashboard", icon: BarChart3 },
  { title: "Transações", url: "/", icon: Home },
  { title: "Recorrentes", url: "/recurring", icon: Repeat },
  { title: "Categorias", url: "/categories", icon: Tag },
  { title: "Patrimônio", url: "/banks", icon: Building2 },
  { title: "Orçamento", url: "/budget", icon: PiggyBank },
  { title: "Metas", url: "/goals", icon: Target },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const { theme, setTheme } = useTheme();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-r">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
            <Coins className="w-5 h-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="text-lg font-bold text-foreground">GutiosCoins</span>
          )}
        </div>
      </div>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1 p-2">
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={collapsed ? item.title : undefined} className="h-11">
                    <NavLink 
                      to={item.url} 
                      end={item.url === "/"}
                      className="flex items-center gap-3 px-3 py-2 text-base font-medium"
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      <span className="truncate">{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter className="p-2">
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "default"}
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="w-full justify-start h-11"
        >
          {theme === "dark" ? (
            <>
              <Sun className="h-5 w-5 shrink-0" />
              {!collapsed && <span className="ml-3">Modo Claro</span>}
            </>
          ) : (
            <>
              <Moon className="h-5 w-5 shrink-0" />
              {!collapsed && <span className="ml-3">Modo Escuro</span>}
            </>
          )}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
