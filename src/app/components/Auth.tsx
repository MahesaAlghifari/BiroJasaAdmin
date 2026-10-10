import { useState } from "react";
import { motion } from "motion/react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Lock, Mail, Eye, EyeOff, Sparkles, User, Truck } from "lucide-react";
import { Badge } from "./ui/badge";
import { toast } from "sonner";

import { userRepository } from "../../data/repositories/userRepository";

interface AuthProps {
  onLogin: (role: 'administrator' | 'finance' | 'admin' | 'messenger', userName: string, userId: string, employeeId?: string) => void;
}

export function Auth({ onLogin }: AuthProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const credentials = userRepository.getDemoCredentials();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    setTimeout(async () => {
      const session = await userRepository.authenticate(email, password);
      setIsLoading(false);

      if (session) {
        const roleLabel = session.role === "administrator" ? "Administrator" : session.role === "finance" ? "Finance" : session.role === "messenger" ? `Messenger (${session.name})` : "Admin";
        toast.success(`Login berhasil sebagai ${roleLabel}!`);
        onLogin(session.role, session.name, session.userId, session.employeeId);
      } else {
        toast.error("Email atau password salah!");
      }
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [0, -90, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="p-4 sm:p-6 md:p-8 border border-border shadow-sm bg-card">
          {/* Logo/Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center mb-6"
          >
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-primary-foreground mb-3 shadow-xs">
              <Sparkles className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Biro Jasa System
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Sistem Administrasi Operasional SUN89</p>
          </motion.div>

          {/* Login Form */}
          <div className="space-y-5">
              <form onSubmit={handleLogin} className="space-y-3.5">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Label htmlFor="email">Email</Label>
                  <div className="relative mt-2">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="nama@email.com"
                      className="pl-10 bg-input-background border-border"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Label htmlFor="password">Password</Label>
                  <div className="relative mt-2">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pl-10 pr-10 bg-input-background border-border"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                  className="flex items-center text-sm"
                >
                  <label htmlFor="remember-me" className="flex items-center gap-2 cursor-pointer select-none">
                    <input id="remember-me" type="checkbox" className="rounded border-border text-primary" />
                    <span className="text-muted-foreground text-xs">Ingat saya</span>
                  </label>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? "Memproses..." : "Masuk ke Sistem"}
                  </Button>
                </motion.div>
              </form>

              {/* Demo Credentials Info */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="mt-5 pt-5 border-t border-border"
              >
                <p className="text-xs text-muted-foreground text-center mb-3">Demo Credentials</p>
                <div className="grid grid-cols-2 gap-2">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => { setEmail(credentials.administrator.email); setPassword(credentials.administrator.password); }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setEmail(credentials.administrator.email);
                        setPassword(credentials.administrator.password);
                      }
                    }}
                    aria-label="Pilih akun demo Admin SVP"
                    className="p-2.5 border border-border rounded-lg bg-secondary/30 cursor-pointer hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary transition-colors text-left"
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div className="w-6 h-6 rounded-md bg-secondary flex items-center justify-center">
                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <Badge status="role">Admin (SVP)</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">{credentials.administrator.email}</p>
                    <p className="text-[11px] text-muted-foreground">{credentials.administrator.password}</p>
                  </div>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => { setEmail(credentials.finance.email); setPassword(credentials.finance.password); }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setEmail(credentials.finance.email);
                        setPassword(credentials.finance.password);
                      }
                    }}
                    aria-label="Pilih akun demo Finance"
                    className="p-2.5 border border-border rounded-lg bg-secondary/30 cursor-pointer hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary transition-colors text-left"
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div className="w-6 h-6 rounded-md bg-secondary flex items-center justify-center">
                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <Badge status="role">Finance</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">{credentials.finance.email}</p>
                    <p className="text-[11px] text-muted-foreground">{credentials.finance.password}</p>
                  </div>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => { setEmail(credentials.admin.email); setPassword(credentials.admin.password); }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setEmail(credentials.admin.email);
                        setPassword(credentials.admin.password);
                      }
                    }}
                    aria-label="Pilih akun demo Admin Loket"
                    className="p-2.5 border border-border rounded-lg bg-secondary/30 cursor-pointer hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary transition-colors text-left"
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div className="w-6 h-6 rounded-md bg-secondary flex items-center justify-center">
                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <Badge status="role">Admin</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">{credentials.admin.email}</p>
                    <p className="text-[11px] text-muted-foreground">{credentials.admin.password}</p>
                  </div>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => { setEmail(credentials.messenger1.email); setPassword(credentials.messenger1.password); }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setEmail(credentials.messenger1.email);
                        setPassword(credentials.messenger1.password);
                      }
                    }}
                    aria-label="Pilih akun demo Messenger Budi"
                    className="p-2.5 border border-border rounded-lg bg-secondary/30 cursor-pointer hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary transition-colors text-left"
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div className="w-6 h-6 rounded-md bg-secondary flex items-center justify-center">
                        <Truck className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <Badge status="role">Msg: Budi</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">{credentials.messenger1.email}</p>
                    <p className="text-[11px] text-muted-foreground">{credentials.messenger1.password}</p>
                  </div>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => { setEmail(credentials.messenger2.email); setPassword(credentials.messenger2.password); }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setEmail(credentials.messenger2.email);
                        setPassword(credentials.messenger2.password);
                      }
                    }}
                    aria-label="Pilih akun demo Messenger Andi"
                    className="p-2.5 border border-border rounded-lg bg-secondary/30 cursor-pointer hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary transition-colors col-span-2 text-left"
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div className="w-6 h-6 rounded-md bg-secondary flex items-center justify-center">
                        <Truck className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <Badge status="role">Msg: Andi Pratama</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">{credentials.messenger2.email}</p>
                    <p className="text-[11px] text-muted-foreground">{credentials.messenger2.password}</p>
                  </div>
                </div>
              </motion.div>
            </div>
        </Card>
      </motion.div>
    </div>
  );
}
