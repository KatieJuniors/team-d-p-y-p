import React from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Redirect } from "wouter";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuth();

  if (!token) {
    return <Redirect to="/login" />;
  }

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "4rem",
  } as React.CSSProperties;

  return (
    <SidebarProvider style={style}>
      <div className="flex h-screen w-full bg-background overflow-hidden relative">
        {/* Abstract background glow for deep SaaS feel */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-accent/5 blur-[120px] pointer-events-none" />

        <AppSidebar />
        
        <div className="flex flex-col flex-1 relative z-10">
          <header className="h-16 flex items-center px-6 border-b border-border/50 bg-background/50 backdrop-blur-md sticky top-0 z-20">
            <SidebarTrigger className="hover-elevate" />
          </header>
          <main className="flex-1 overflow-y-auto p-6 md:p-8">
            <div className="max-w-7xl mx-auto w-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
