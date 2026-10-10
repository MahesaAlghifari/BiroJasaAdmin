import { useState } from "react";
import {
  CheckSquare,
  Clock,
  Receipt,
  User,
  Truck,
} from "lucide-react";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { ErrorBoundary } from "../ErrorBoundary";
import { UserContext } from "../../data/messengerTaskAdapter";
import { MessengerTasksView } from "./MessengerTasksView";
import { MessengerSamsatView } from "./MessengerSamsatView";
import { MessengerReimbursementView } from "./MessengerReimbursementView";
import { MessengerProfileView } from "./MessengerProfileView";
import { cn } from "../ui/utils";

interface MessengerWorkspaceProps {
  onLogout: () => void;
  currentUser: UserContext;
}

export type MessengerTabType = "tugas" | "samsat" | "reimbursement" | "profil";

export function MessengerWorkspace({ onLogout, currentUser }: MessengerWorkspaceProps) {
  const [currentTab, setCurrentTab] = useState<MessengerTabType>("tugas");
  const [targetOrderNo, setTargetOrderNo] = useState<string | undefined>(undefined);

  const navItems: { id: MessengerTabType; label: string; icon: any }[] = [
    { id: "tugas", label: "Tugas", icon: CheckSquare },
    { id: "samsat", label: "Proses Samsat", icon: Clock },
    { id: "reimbursement", label: "Pengajuan Biaya", icon: Receipt },
    { id: "profil", label: "Profil", icon: User },
  ];

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const handleNavigateToTab = (tab: string, orderNo?: string) => {
    if (tab === "samsat" || tab === "tugas" || tab === "reimbursement" || tab === "profil") {
      setCurrentTab(tab as MessengerTabType);
      if (orderNo) setTargetOrderNo(orderNo);
    }
  };

  return (
    <div className="min-h-screen w-full bg-background flex flex-col text-left">
      {/* Top Navbar Header (Clean & Readable, No Theme Toggle) */}
      <header className="sticky top-0 z-30 w-full border-b border-border/80 bg-card/95 backdrop-blur-md shadow-2xs">
        <div className="w-full max-w-xl md:max-w-4xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          {/* Brand Logo & Messenger Workspace Title */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div className="min-w-0 truncate">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-foreground tracking-tight leading-tight truncate">
                  Admin SUN89
                </h1>
                <Badge
                  variant="outline"
                  className="text-xs font-semibold bg-primary/10 text-primary border-primary/20 shrink-0"
                >
                  Messenger
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground truncate leading-tight mt-0.5">
                Workspace Operasional Lapangan
              </p>
            </div>
          </div>

          {/* User Profile Chip (Navigates to Profile Tab) */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setCurrentTab("profil")}
              className={cn(
                "flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl border border-border/70 hover:bg-muted/70 transition-colors text-left min-h-[44px]",
                currentTab === "profil" && "bg-muted border-primary/40"
              )}
              title="Buka Profil Petugas"
            >
              <Avatar className="w-7 h-7">
                <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">
                  {getInitials(currentUser.userName)}
                </AvatarFallback>
              </Avatar>
              <div className="truncate max-w-[100px] sm:max-w-[140px]">
                <p className="text-sm font-semibold text-foreground leading-tight truncate">
                  {currentUser.userName.split(" ")[0]}
                </p>
                <p className="text-[11px] font-mono text-muted-foreground leading-tight">
                  {currentUser.employeeId || "MESSENGER"}
                </p>
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Content Area (Mobile-First max-w-xl, safe padding pb-28) */}
      <main className="flex-1 w-full max-w-xl md:max-w-4xl mx-auto px-4 py-4 pb-28 overflow-x-hidden">
        <ErrorBoundary fallbackTitle="Terjadi kesalahan pada Workspace Messenger">
          <div className="w-full animate-in fade-in duration-150">
            {currentTab === "tugas" && (
              <MessengerTasksView
                currentUser={currentUser}
                onNavigateToTab={handleNavigateToTab}
              />
            )}

            {currentTab === "samsat" && (
              <MessengerSamsatView
                currentUser={currentUser}
                initialSelectedOrderNo={targetOrderNo}
              />
            )}

            {currentTab === "reimbursement" && (
              <MessengerReimbursementView
                currentUser={currentUser}
              />
            )}

            {currentTab === "profil" && (
              <MessengerProfileView
                currentUser={currentUser}
                onLogout={onLogout}
              />
            )}
          </div>
        </ErrorBoundary>
      </main>

      {/* Mobile Sticky Bottom Navigation Bar (4 Main Tabs, Height 72px, Touch Target >= 44px) */}
      <nav
        aria-label="Navigasi Bawah Messenger"
        className="fixed bottom-0 left-0 right-0 z-40 w-full border-t border-border bg-card/95 backdrop-blur-md shadow-lg"
      >
        <div className="w-full max-w-xl mx-auto h-[72px] px-2 flex items-center justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center h-full min-h-[48px] py-1 px-1 rounded-xl transition-all duration-150 relative",
                  isActive
                    ? "text-primary font-bold"
                    : "text-muted-foreground hover:text-foreground active:scale-95"
                )}
              >
                <div
                  className={cn(
                    "p-1.5 rounded-xl transition-colors",
                    isActive && "bg-primary/10 text-primary"
                  )}
                >
                  <Icon className={cn("w-6 h-6", isActive ? "stroke-[2.5]" : "stroke-2")} />
                </div>
                <span className="text-xs font-semibold mt-0.5 tracking-tight leading-none text-center">
                  {item.label}
                </span>

                {/* Active indicator dot */}
                {isActive && (
                  <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
