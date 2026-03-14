import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./contexts/AuthContext";

// Pages
import NotFound from "@/pages/not-found";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import Dashboard from "./pages/dashboard/Dashboard";
import Products from "./pages/products/Products";
import Categories from "./pages/categories/Categories";
import Receipts from "./pages/operations/Receipts";
import Deliveries from "./pages/operations/Deliveries";
import Transfers from "./pages/operations/Transfers";
import Adjustments from "./pages/operations/Adjustments";
import History from "./pages/operations/History";
import Warehouses from "./pages/settings/Warehouses";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    }
  }
});

// Force global dark mode for the app
if (typeof document !== 'undefined') {
  document.documentElement.classList.add('dark');
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      
      {/* Protected Routes enclosed in AppLayout via their own page components */}
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/products" component={Products} />
      <Route path="/categories" component={Categories} />
      
      <Route path="/operations/receipts" component={Receipts} />
      <Route path="/operations/deliveries" component={Deliveries} />
      <Route path="/operations/transfers" component={Transfers} />
      <Route path="/operations/adjustments" component={Adjustments} />
      <Route path="/operations/history" component={History} />
      
      <Route path="/settings/warehouses" component={Warehouses} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <TooltipProvider>
          <AuthProvider>
            <Router />
          </AuthProvider>
          <Toaster />
        </TooltipProvider>
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
