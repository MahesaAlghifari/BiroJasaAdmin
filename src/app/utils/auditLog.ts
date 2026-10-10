// Audit Log Utility for tracking real user & system actions
import { useState, useEffect } from "react";

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  userId: string;
  userName: string;
  userRole: 'administrator' | 'finance' | 'admin' | 'messenger';
  action: string;
  module: string;
  details: string;
  ipAddress?: string;
  metadata?: Record<string, any>;
}

class AuditLogService {
  private logs: AuditLogEntry[] = [];
  private counter = 0;
  private listeners: Set<() => void> = new Set();

  constructor() {
    // Single Source of Truth: Inisialisasi bersih tanpa fake/dummy records
    this.logs = [];
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn());
  }

  log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): void {
    const newEntry: AuditLogEntry = {
      ...entry,
      id: `log-${Date.now()}-${++this.counter}`,
      timestamp: new Date(),
    };
    this.logs.unshift(newEntry);
    this.notify();
  }

  getLogs(filters?: {
    userId?: string;
    userRole?: string;
    module?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
  }): AuditLogEntry[] {
    let filteredLogs = [...this.logs];

    if (filters) {
      if (filters.userId) {
        filteredLogs = filteredLogs.filter(log => log.userId === filters.userId);
      }
      if (filters.userRole && filters.userRole !== 'all') {
        filteredLogs = filteredLogs.filter(log => log.userRole === filters.userRole);
      }
      if (filters.module && filters.module !== 'all') {
        filteredLogs = filteredLogs.filter(log => 
          log.module.toLowerCase().includes(filters.module!.toLowerCase())
        );
      }
      if (filters.action && filters.action !== 'all') {
        filteredLogs = filteredLogs.filter(log => log.action === filters.action);
      }
      if (filters.startDate) {
        filteredLogs = filteredLogs.filter(log => log.timestamp >= filters.startDate!);
      }
      if (filters.endDate) {
        filteredLogs = filteredLogs.filter(log => log.timestamp <= filters.endDate!);
      }
    }

    return filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  getAllLogs(): AuditLogEntry[] {
    return [...this.logs].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  getLogById(id: string): AuditLogEntry | undefined {
    return this.logs.find(log => log.id === id);
  }

  clearLogs(): void {
    this.logs = [];
    this.notify();
  }
}

export const auditLog = new AuditLogService();

export function useAuditLog() {
  const [, setTick] = useState(0);
  useEffect(() => {
    return auditLog.subscribe(() => setTick((t) => t + 1));
  }, []);
  return auditLog.getAllLogs();
}
