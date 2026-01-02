import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/AuthContext";
import { FinanceProvider } from "@/contexts/FinanceContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppSidebar } from "@/components/AppSidebar";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import RecurringTransactions from "./pages/RecurringTransactions";
import Installments from "./pages/Installments";
import Categories from "./pages/Categories";
import Banks from "./pages/Banks";
import Budget from "./pages/Budget";
import Goals from "./pages/Goals";
import Loans from "./pages/Loans";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark" storageKey="finance-app-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <FinanceProvider>
                      <SidebarProvider>
                        <div className="flex min-h-screen w-full">
                          <AppSidebar />
                          <SidebarInset className="flex-1">
                            <main className="p-6">
                              <Routes>
                                <Route path="/" element={<Transactions />} />
                                <Route path="/dashboard" element={<Dashboard />} />
                                <Route path="/recurring" element={<RecurringTransactions />} />
                                <Route path="/installments" element={<Installments />} />
                                <Route path="/categories" element={<Categories />} />
                                <Route path="/banks" element={<Banks />} />
                                <Route path="/budget" element={<Budget />} />
                                <Route path="/goals" element={<Goals />} />
                                <Route path="/loans" element={<Loans />} />
                                <Route path="*" element={<NotFound />} />
                              </Routes>
                            </main>
                          </SidebarInset>
                        </div>
                      </SidebarProvider>
                    </FinanceProvider>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
