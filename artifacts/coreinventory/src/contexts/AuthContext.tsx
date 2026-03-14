import React, { createContext, useContext, useEffect, useState } from "react";
import { User, LoginRequest, useAuthGetMe, authLogin, authSignup, SignupRequest } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  signup: (data: SignupRequest) => Promise<void>;
  logout: () => void;
  token: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Patches global fetch to always include the Bearer token for our generated hooks
const setupFetchInterceptor = () => {
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const [resource, config] = args;
    const token = localStorage.getItem("coreinventory_token");
    
    // Only intercept requests to our API
    if (typeof resource === 'string' && resource.startsWith('/api') && token) {
      const newConfig = config || {};
      newConfig.headers = {
        ...newConfig.headers,
        Authorization: `Bearer ${token}`,
      };
      args[1] = newConfig;
    }
    
    const response = await originalFetch(...args);
    
    // If we get a 401 and we're not on the login page, handle logout
    if (response.status === 401 && !window.location.pathname.startsWith('/login')) {
      localStorage.removeItem("coreinventory_token");
      window.dispatchEvent(new Event('auth-unauthorized'));
    }
    
    return response;
  };
};

// Run once
setupFetchInterceptor();

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem("coreinventory_token"));
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: user, isLoading: isUserLoading, refetch } = useAuthGetMe({
    query: {
      enabled: !!token,
      retry: false,
    }
  });

  useEffect(() => {
    const handleUnauthorized = () => {
      setToken(null);
      setLocation("/login");
    };
    window.addEventListener('auth-unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth-unauthorized', handleUnauthorized);
  }, [setLocation]);

  const login = async (data: LoginRequest) => {
    try {
      const res = await authLogin(data);
      localStorage.setItem("coreinventory_token", res.token);
      setToken(res.token);
      await refetch();
      setLocation("/dashboard");
      toast({ title: "Welcome back!" });
    } catch (err: any) {
      toast({ 
        title: "Login failed", 
        description: err?.message || "Invalid credentials", 
        variant: "destructive" 
      });
      throw err;
    }
  };

  const signup = async (data: SignupRequest) => {
    try {
      const res = await authSignup(data);
      localStorage.setItem("coreinventory_token", res.token);
      setToken(res.token);
      await refetch();
      setLocation("/dashboard");
      toast({ title: "Account created successfully!" });
    } catch (err: any) {
      toast({ 
        title: "Signup failed", 
        description: err?.message || "Could not create account", 
        variant: "destructive" 
      });
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem("coreinventory_token");
    setToken(null);
    setLocation("/login");
    toast({ title: "Logged out" });
  };

  // Prevent flashing protected content before auth check completes
  const isLoading = !!token && isUserLoading;

  return (
    <AuthContext.Provider value={{ user: user || null, isLoading, login, signup, logout, token }}>
      {isLoading ? (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
