import { useState, useMemo, useEffect } from "react";
import { motion } from "motion/react";
import { 
  TrendingUp, 
  Users, 
  FileText, 
  Package,
  CheckCircle,
  Clock,
  AlertCircle,
  Calendar as CalendarIcon,
  CreditCard,
  Truck,
  Wallet
} from "lucide-react";
import { Card } from "./ui/card";
import { Badge, getStatusBadgeClass } from "./ui/badge";
import { Calendar } from "./ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useOrderStore } from "../data/orderStore";
import { useFinanceStore } from "../data/financeStore";
import { auditLog } from "../utils/auditLog";
import {
  getOperationalKPIs,
  getBerkasCountByFilter,
  getFinancialKPIs,
  getServiceDistribution,
  getMonthlyTrend,
  getCalendarReminders,
  getRemindersForDate,
  hasRemindersForDate,
  getRecentActivities,
} from "../data/dashboardAdapter";

export function Dashboard() {
  const [berkasFilter, setBerkasFilter] = useState<"hari" | "minggu" | "bulan" | "tahun">("bulan");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [auditTick, setAuditTick] = useState(0);

  useEffect(() => {
    return auditLog.subscribe(() => setAuditTick((t) => t + 1));
  }, []);

  // Reactive operational data from OrderStore (authoritative SSoT)
  const { activeOrders, archivedOrders } = useOrderStore();

  // Reactive financial data from FinanceStore (authoritative SSoT)
  const { invoices, kasKantorList, profitList } = useFinanceStore();

  // Derived Operational KPIs
  const operationalKPIs = useMemo(
    () => getOperationalKPIs(activeOrders, archivedOrders),
    [activeOrders, archivedOrders]
  );

  // Derived Financial KPIs
  const financialKPIs = useMemo(
    () => getFinancialKPIs(invoices, kasKantorList, profitList),
    [invoices, kasKantorList, profitList]
  );

  // Filtered active berkas count
  const filteredBerkasCount = useMemo(
    () => getBerkasCountByFilter(activeOrders, berkasFilter),
    [activeOrders, berkasFilter]
  );

  // Monthly trend data for AreaChart (6-month rolling window)
  const chartData = useMemo(
    () => getMonthlyTrend(activeOrders, archivedOrders, profitList),
    [activeOrders, archivedOrders, profitList]
  );

  // Service distribution for PieChart
  const serviceDistribution = useMemo(
    () => getServiceDistribution(activeOrders, archivedOrders),
    [activeOrders, archivedOrders]
  );

  // Dynamic calendar reminders from real invoices & orders
  const reminders = useMemo(
    () => getCalendarReminders(activeOrders, invoices),
    [activeOrders, invoices]
  );

  // Reminders for selected date
  const todaysReminders = useMemo(
    () => getRemindersForDate(reminders, selectedDate),
    [reminders, selectedDate]
  );

  // Recent activities from authoritative audit log
  const recentActivities = useMemo(() => {
    const logs = auditLog.getLogs();
    return getRecentActivities(logs, activeOrders, invoices);
  }, [auditTick, activeOrders, invoices]);

  const getReminderIcon = (type: string) => {
    switch(type) {
      case "payment": return <CreditCard className="w-4 h-4" />;
      case "pickup": return <Truck className="w-4 h-4" />;
      case "delivery": return <Truck className="w-4 h-4" />;
      case "salary": return <Wallet className="w-4 h-4" />;
      default: return <CalendarIcon className="w-4 h-4" />;
    }
  };

  const statsData = [
    {
      icon: FileText,
      label: "Berkas Aktif",
      value: filteredBerkasCount,
      change: `${operationalKPIs.totalOrderCount} total berkas`,
      iconBg: "bg-primary/10 text-primary",
      filter: true
    },
    {
      icon: Users,
      label: "Total Client",
      value: operationalKPIs.totalClientCount,
      change: `${operationalKPIs.orderSelesaiCount} berkas tuntas`,
      iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      filter: false
    },
    {
      icon: Package,
      label: "Task Pending",
      value: operationalKPIs.pendingTasksCount,
      change: `${operationalKPIs.activeOrdersCount} proses aktif`,
      iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      filter: false
    },
  ];

  return (
    <div className="space-y-4 p-3 sm:p-4 md:p-6 w-full min-w-0 text-left">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-lg md:text-xl font-semibold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">Ringkasan operasional dan performa bisnis Biro Jasa SUN89</p>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {statsData.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
          >
            <Card className="p-4 border border-border/80 bg-card shadow-xs relative overflow-hidden transition-all duration-200 hover:border-border">
              <div className="flex items-start justify-between relative z-10">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2">
                    <p className="text-muted-foreground text-xs font-medium">{stat.label}</p>
                    {stat.filter && (
                      <Select 
                        value={berkasFilter} 
                        onValueChange={(val: any) => setBerkasFilter(val)}
                      >
                        <SelectTrigger className="w-24 h-6 text-[11px] bg-muted/40 border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hari">Per Hari</SelectItem>
                          <SelectItem value="minggu">Per Minggu</SelectItem>
                          <SelectItem value="bulan">Per Bulan</SelectItem>
                          <SelectItem value="tahun">Per Tahun</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <h3 className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums mb-1">{stat.value}</h3>
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    {stat.change}
                  </span>
                </div>
                <div className={`p-2.5 rounded-xl ${stat.iconBg} ml-3 shrink-0`}>
                  <stat.icon className="w-5 h-5" />
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts & Calendar Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        {/* Profit Trend Chart */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2"
        >
          <Card className="p-4 border border-border/80 bg-card shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Tren Profit & Order</h3>
                <p className="text-xs text-muted-foreground">6 bulan terakhir (berdasarkan data transaksi nyata)</p>
              </div>
              <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop key="stop-top" offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                    <stop key="stop-bottom" offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid key="grid" strokeDasharray="3 3" stroke="currentColor" className="text-border/50" />
                <XAxis key="x-axis" dataKey="name" stroke="currentColor" className="text-muted-foreground text-xs" />
                <YAxis 
                  key="y-axis" 
                  stroke="currentColor" 
                  className="text-muted-foreground text-xs"
                  tickFormatter={(val) => val >= 1000000 ? `${(val / 1000000).toFixed(0)}Jt` : String(val)}
                />
                <Tooltip
                  key="tooltip"
                  formatter={(value: any) => [`Rp ${Number(value || 0).toLocaleString("id-ID")}`, "Profit"]}
                  contentStyle={{
                    backgroundColor: 'var(--popover)',
                    borderColor: 'var(--border)',
                    borderRadius: '8px',
                    color: 'var(--popover-foreground)',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                />
                <Area
                  key="area-profit"
                  type="monotone"
                  dataKey="profit"
                  stroke="#2563eb"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorProfit)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>

        {/* Service Distribution */}
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-4 border border-border/80 bg-card shadow-xs">
            <h3 className="mb-4 text-sm font-semibold text-foreground">Distribusi Layanan</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={serviceDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {serviceDistribution.map((entry) => (
                    <Cell key={`cell-${entry.name}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any, name: any, item: any) => [`${value}% (${item.payload.count} berkas)`, name]}
                  contentStyle={{ 
                    backgroundColor: 'var(--popover)', 
                    borderColor: 'var(--border)',
                    borderRadius: '8px',
                    color: 'var(--popover-foreground)',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {serviceDistribution.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-foreground">{item.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono tabular-nums">{item.value}% ({item.count})</span>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Calendar & Reminders Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        {/* Calendar */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-1"
        >
          <Card className="p-2.5 sm:p-4 border border-border/80 bg-card shadow-xs overflow-hidden">
            <div className="flex items-center gap-2 mb-3">
              <CalendarIcon className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Kalender Operasional</h3>
            </div>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border-border w-full flex justify-center p-1 sm:p-3"
              modifiers={{
                hasReminder: (date) => hasRemindersForDate(reminders, date)
              }}
              modifiersStyles={{
                hasReminder: {
                  backgroundColor: 'rgba(37, 99, 235, 0.12)',
                  color: 'var(--primary)',
                  fontWeight: '600',
                  borderRadius: '6px'
                }
              }}
            />
            <div className="mt-4 pt-3 border-t border-border/60 space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="w-2.5 h-2.5 rounded-full bg-primary/30 border border-primary/60" />
                <span>Tanggal dengan jadwal operasional & tagihan</span>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Reminders for Selected Date */}
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-2"
        >
          <Card className="p-4 border border-border/80 bg-card shadow-xs">
            <h3 className="mb-3 text-sm font-semibold text-foreground">
              <span className="hidden md:inline">Jadwal & Reminder - {selectedDate?.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              <span className="md:hidden">Jadwal - {selectedDate?.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </h3>
            <div className="space-y-2.5">
              {todaysReminders.length > 0 ? (
                todaysReminders.map((reminder) => (
                  <Card key={reminder.id} className="p-3 md:p-3.5 border border-border/80 bg-card shadow-2xs hover:border-border transition-colors">
                    <div className="flex items-start gap-2.5 md:gap-3">
                      <div className={`p-2 rounded-lg shrink-0 ${
                        reminder.type === "payment"
                          ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                          : reminder.type === "salary"
                          ? "bg-primary/10 text-primary"
                          : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                      }`}>
                        {getReminderIcon(reminder.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs md:text-sm font-semibold text-foreground">{reminder.title}</p>
                            {reminder.type === "payment" && (
                              <div className="text-[11px] text-muted-foreground mt-1 space-y-0.5">
                                <p className="truncate"><span className="text-foreground/70">Client:</span> {reminder.client}</p>
                                <p className="truncate"><span className="text-foreground/70">Order / Invoice:</span> {reminder.orderNo}</p>
                                <p className="text-rose-600 dark:text-rose-400 font-mono tabular-nums font-semibold truncate">{reminder.amount}</p>
                              </div>
                            )}
                            {reminder.type === "pickup" && (
                              <div className="text-[11px] text-muted-foreground mt-1 space-y-0.5">
                                <p className="truncate"><span className="text-foreground/70">Messenger:</span> {reminder.messenger}</p>
                                <p className="truncate"><span className="text-foreground/70">Lokasi:</span> {reminder.location}</p>
                                <p className="truncate"><span className="text-foreground/70">No. Order:</span> {reminder.orderNo}</p>
                              </div>
                            )}
                            {reminder.type === "delivery" && (
                              <div className="text-[11px] text-muted-foreground mt-1 space-y-0.5">
                                <p className="truncate"><span className="text-foreground/70">Messenger:</span> {reminder.messenger}</p>
                                <p className="truncate"><span className="text-foreground/70">Lokasi:</span> {reminder.location}</p>
                                <p className="truncate"><span className="text-foreground/70">No. Order:</span> {reminder.orderNo}</p>
                              </div>
                            )}
                            {reminder.type === "salary" && (
                              <div className="text-[11px] text-muted-foreground mt-1 space-y-0.5">
                                <p className="truncate"><span className="text-foreground/70">Dept:</span> {reminder.department}</p>
                                <p className="text-primary font-mono tabular-nums font-semibold truncate">{reminder.amount}</p>
                              </div>
                            )}
                          </div>
                          <Badge status={reminder.type}>
                            {reminder.type === "payment" && "Tagihan"}
                            {reminder.type === "pickup" && "Jemput"}
                            {reminder.type === "delivery" && "Antar"}
                            {reminder.type === "salary" && "Gaji"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <CalendarIcon className="w-10 h-10 mx-auto mb-2 text-muted-foreground/40" />
                  <p className="text-xs">Tidak ada jadwal operasional atau reminder untuk tanggal ini</p>
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Recent Activities */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card className="p-4 border border-border/80 bg-card shadow-xs">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Aktivitas Terbaru</h3>
          <div className="space-y-2">
            {recentActivities.length > 0 ? (
              recentActivities.map((activity, index) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + index * 0.08 }}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors"
                >
                  {activity.type === "success" && <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />}
                  {activity.type === "pending" && <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />}
                  {activity.type === "warning" && <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground">{activity.message}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{activity.time}</p>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center text-muted-foreground py-6">
                <Clock className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-xs">Belum ada riwayat aktivitas operasional</p>
              </div>
            )}
          </div>
        </Card>
      </motion.div>
    </div>
  );
}