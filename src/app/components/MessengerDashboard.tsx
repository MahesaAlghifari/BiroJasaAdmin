import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Truck,
  FileCheck,
  User,
  LogOut,
  Menu,
  ChevronRight,
  Bell,
  Sun,
  Moon,
  FileText,
  Clock,
  PackageCheck,
  CheckCircle2,
  TrendingUp,
  MapPin,
  Phone,
} from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { ErrorBoundary } from "./ErrorBoundary";
import { MessengerDocuments } from "./MessengerDocuments";
import { Profile } from "./Profile";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { cn } from "./ui/utils";

interface MenuItem {
  id: string;
  label: string;
  icon: any;
}

const menuItems: MenuItem[] = [
  { id: "tasks", label: "Task Saya", icon: FileCheck },
  { id: "profile", label: "Profile", icon: User },
];

interface MessengerDashboardProps {
  onLogout: () => void;
}

export function MessengerDashboard({ onLogout }: MessengerDashboardProps) {
  const [currentPage, setCurrentPage] = useState("tasks");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  // Sample stats for dashboard
  const stats = [
    {
      label: "Jemput Dokumen",
      value: 3,
      icon: FileText,
      color: "blue",
    },
    {
      label: "Proses Samsat",
      value: 2,
      icon: Clock,
      color: "yellow",
    },
    {
      label: "Ambil Dokumen",
      value: 1,
      icon: PackageCheck,
      color: "purple",
    },
    {
      label: "Antar Dokumen",
      value: 1,
      icon: CheckCircle2,
      color: "green",
    },
  ];

  useEffect(() => {
    document.body.className = theme;
  }, [theme]);

  const renderPage = () => {
    switch (currentPage) {
      case "tasks":
        return <MessengerDocuments />;
      case "profile":
        return <Profile userRole="messenger" />;
      default:
        return <MessengerDocuments />;
    }
  };

  const getPageTitle = () => {
    const item = menuItems.find((item) => item.id === currentPage);
    return item ? item.label : "Task Saya";
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileSidebarOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 lg:hidden"
            />
            {/* Sidebar */}
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25 }}
              className="fixed inset-y-0 left-0 w-[280px] glass-sidebar z-50 lg:hidden flex flex-col"
            >
              <SidebarContent
                isSidebarOpen={true}
                currentPage={currentPage}
                setCurrentPage={(page) => {
                  setCurrentPage(page);
                  setIsMobileSidebarOpen(false);
                }}
                onLogout={onLogout}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <motion.aside
        initial={false}
        animate={{
          width: isSidebarOpen ? 280 : 80,
        }}
        className="glass-sidebar hidden lg:flex flex-col relative z-30 transition-all duration-300"
      >
        <SidebarContent
          isSidebarOpen={isSidebarOpen}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          onLogout={onLogout}
        />

        {/* Toggle Button */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="hidden lg:flex absolute -right-3 top-7 w-6 h-6 items-center justify-center rounded-full bg-card border border-border/80 shadow-xs hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronRight
            className={cn(
              "w-4 h-4 transition-transform",
              !isSidebarOpen && "rotate-180"
            )}
          />
        </button>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-card border-b border-border/80 px-4 py-2.5 md:px-6 md:py-3 flex items-center justify-between shrink-0 shadow-xs z-10">
          <div className="flex items-center gap-2 md:gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden h-8 w-8 p-0"
            >
              <Menu className="w-4 h-4" />
            </Button>
            <div>
              <h2 className="text-sm md:text-base leading-tight font-semibold text-foreground">{getPageTitle()}</h2>
              <p className="text-[11px] text-muted-foreground hidden sm:block">
                Kelola tugas messenger Anda
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 md:gap-2">
            <Button variant="ghost" size="sm" onClick={toggleTheme} className="relative h-8 w-8 p-0">
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
            <Button variant="ghost" size="sm" className="relative h-8 w-8 p-0">
              <Bell className="w-4 h-4" />
              <Badge className="absolute -top-1 -right-1 min-w-4 h-4 p-0 flex items-center justify-center bg-rose-500 text-white text-[10px] font-semibold rounded-full px-1 border-0">
                3
              </Badge>
            </Button>
            <div
              className="flex items-center gap-2.5 pl-2 md:pl-3 border-l border-border/80 cursor-pointer hover:bg-muted/60 rounded-lg px-2 py-1 transition-colors"
              onClick={() => setCurrentPage("profile")}
            >
              <Avatar className="w-7 h-7">
                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs border border-primary/20">
                  MS
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block">
                <p className="text-xs font-medium text-foreground leading-tight">Messenger</p>
                <p className="text-[11px] text-muted-foreground">
                  messenger@birojasa.com
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <ErrorBoundary
            key={currentPage}
            fallbackTitle={`Terjadi kendala saat memuat ${getPageTitle()}`}
            onReset={() => setCurrentPage("tugas")}
          >
            <div className="h-full animate-in fade-in duration-150">
              {renderPage()}
            </div>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

function SidebarContent({
  isSidebarOpen,
  currentPage,
  setCurrentPage,
  onLogout,
}: {
  isSidebarOpen: boolean;
  currentPage: string;
  setCurrentPage: (page: string) => void;
  onLogout: () => void;
}) {
  return (
    <>
      {/* Logo */}
      <div className="px-4 py-3.5 border-b border-border/80 shrink-0">
        <motion.div
          animate={{ opacity: isSidebarOpen ? 1 : 0 }}
          className="flex items-center gap-3"
        >
          <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
            <Truck className="w-4 h-4 text-white" />
          </div>
          {isSidebarOpen && (
            <div>
              <h1 className="text-sm font-semibold tracking-tight text-foreground leading-tight">
                Messenger SUN89
              </h1>
              <p className="text-[11px] text-muted-foreground font-normal">Task Dashboard</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;

          return (
            <motion.button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors relative group text-sm font-medium",
                isActive
                  ? "bg-primary/10 text-primary dark:bg-primary/15 dark:text-blue-400"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4 flex-shrink-0 relative z-10",
                  isActive ? "text-primary dark:text-blue-400" : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              {isSidebarOpen && (
                <span
                  className={cn(
                    "relative z-10 flex-1 text-left truncate",
                    isActive ? "text-primary dark:text-blue-400" : "text-foreground/80 group-hover:text-foreground"
                  )}
                >
                  {item.label}
                </span>
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* Logout Button */}
      <div className="px-3 py-3 border-t border-border/80 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={onLogout}
          className={cn(
            "w-full justify-start gap-2.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 text-sm transition-colors",
            !isSidebarOpen && "justify-center"
          )}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {isSidebarOpen && <span>Logout</span>}
        </Button>
      </div>
    </>
  );
}
