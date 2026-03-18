import { Receipt, Tag, Building2, PiggyBank, Repeat, Target, BarChart3, Moon, Sun, Coins, TrendingDown, PanelLeft, Layers } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/UserMenu";

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
  SidebarTrigger,
} from "@/components/ui/sidebar";

const items = [
  { title: "Dashboard", url: "/dashboard", icon: BarChart3 },
  { title: "Transações", url: "/", icon: Receipt },
  { title: "Recorrentes", url: "/recurring", icon: Repeat },
  { title: "Compromissos", url: "/compromissos", icon: Layers },
  { title: "Categorias", url: "/categories", icon: Tag },
  { title: "Patrimônio", url: "/banks", icon: Building2 },
  { title: "Orçamento", url: "/budget", icon: PiggyBank },
  { title: "Metas", url: "/goals", icon: Target },
];

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const { theme, setTheme } = useTheme();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-r-0 transition-all duration-300">
      <div className="h-14 flex items-center px-3 border-b transition-all duration-300">
        <div className="flex items-center gap-2">
          <div className={`flex items-center justify-center rounded-lg bg-primary transition-all duration-300 ${
            collapsed ? 'w-7 h-7' : 'w-8 h-8'
          }`}>
            <Coins className={`text-primary-foreground transition-all duration-300 ${
              collapsed ? 'w-4 h-4' : 'w-5 h-5'
            }`} />
          </div>
          <span className={`text-lg font-bold text-foreground transition-all duration-300 ${
            collapsed ? 'opacity-0 w-0' : 'opacity-100'
          }`}>
            GutiosCoins
          </span>
        </div>
      </div>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1 p-2">
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    tooltip={collapsed ? item.title : undefined}
                    className="h-11 px-3"
                  >
                    <NavLink 
                      to={item.url} 
                      end={item.url === "/"}
                      className="flex items-center text-base font-medium transition-colors w-full"
                      title={item.title}
                    >
                      <item.icon className={`shrink-0 transition-all duration-300 ${
                        collapsed ? 'h-4 w-4' : 'h-5 w-5'
                      }`} />
                      <span className={`ml-3 truncate transition-all duration-300 ${collapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
                        {item.title}
                      </span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter className="p-2 space-y-1">
        <Button
          variant="ghost"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="w-full justify-start h-11 px-3"
          title={theme === "dark" ? "Modo Claro" : "Modo Escuro"}
        >
          {theme === "dark" ? (
            <>
              <Sun className={`shrink-0 transition-all duration-300 ${
                collapsed ? 'h-4 w-4' : 'h-5 w-5'
              }`} />
              <span className={`ml-3 transition-all duration-300 ${collapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
                Modo Claro
              </span>
            </>
          ) : (
            <>
              <Moon className={`shrink-0 transition-all duration-300 ${
                collapsed ? 'h-4 w-4' : 'h-5 w-5'
              }`} />
              <span className={`ml-3 transition-all duration-300 ${collapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
                Modo Escuro
              </span>
            </>
          )}
        </Button>
        <Button
          variant="ghost"
          onClick={toggleSidebar}
          className="w-full justify-start h-11 px-3"
          title="Painel Lateral"
        >
          <PanelLeft className={`shrink-0 transition-all duration-300 ${
            collapsed ? 'h-4 w-4' : 'h-5 w-5'
          }`} />
          <span className={`ml-3 transition-all duration-300 ${collapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
            Painel Lateral
          </span>
        </Button>
        <div className="w-full">
          <UserMenu collapsed={collapsed} />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
