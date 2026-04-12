"use client";

import { Button } from "@/components/ui/button";
import { VoiceButton } from "./voice-button";
import { Menu } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { logout } from "@/lib/auth";
import { useRouter } from "next/navigation";

interface AppTopbarProps {
  title: string;
  onRunAnalysis?: () => void;
  isLoading?: boolean;
  dataLabel?: string;
}

export function AppTopbar({
  title,
  onRunAnalysis,
  isLoading,
  dataLabel,
}: AppTopbarProps) {
  // ✅ ADD THESE
  const { user } = useAuth();
  const router = useRouter();

  return (
    <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 sticky top-0 z-10">
      
      {/* Left side */}
      <div className="flex items-center gap-4">
        <button className="lg:hidden p-2 -ml-2 hover:bg-muted rounded-lg">
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-base font-medium">{title}</h1>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">

        {/* ✅ USER INFO */}
        {user && (
          <span className="text-sm font-medium">
            Hello, {user.email?.split("@")[0]}
          </span>
        )}

        {/* Data badge */}
        <span className="hidden sm:inline-flex text-xs font-mono text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
          {dataLabel ?? "Data: demo_sales.csv"}
        </span>

        {/* Voice button */}
        <VoiceButton />

        {/* Run Analysis button */}
        {onRunAnalysis && (
          <Button
            onClick={onRunAnalysis}
            disabled={isLoading}
            className="bg-foreground hover:bg-foreground/90 text-background rounded-full px-5"
          >
            {isLoading ? "Running..." : "Run Analysis"}
          </Button>
        )}

        {/* ✅ LOGOUT BUTTON */}
        {user && (
          <Button
            variant="outline"
            onClick={async () => {
              await logout();
              router.push("/");
            }}
          >
            Logout
          </Button>
        )}
      </div>
    </header>
  );
}