/**
 * Estimation Template Store & Persistence
 * Admin SUN89 — Biro Jasa Management System
 * 
 * Provides reactive state management and localStorage persistence for
 * estimation templates and component configurations.
 */

import { useState, useEffect } from "react";
import {
  EstimationTemplateConfig,
  EstimationComponentRule,
  EstimationInput,
  EstimationResult,
} from "../../domain/estimation/types";
import {
  DEFAULT_R4_ANNUAL_TEMPLATE,
  DEFAULT_R2_ANNUAL_TEMPLATE,
} from "../../domain/estimation/defaultTemplates";
import { calculateEstimation, defaultRuleRegistry } from "../../domain/estimation/estimationEngine";
import { auditLog } from "../utils/auditLog";

const STORAGE_KEY = "sun89_estimation_templates_v1";

class EstimationStore {
  private templates: Map<string, EstimationTemplateConfig> = new Map();
  private listeners: Set<() => void> = new Set();
  private isLoadedFromStorage = false;

  constructor() {
    this.templates.set(DEFAULT_R4_ANNUAL_TEMPLATE.id, {
      ...DEFAULT_R4_ANNUAL_TEMPLATE,
      components: DEFAULT_R4_ANNUAL_TEMPLATE.components.map((c) => ({ ...c })),
      accIdRates: { ...DEFAULT_R4_ANNUAL_TEMPLATE.accIdRates },
    });
    this.templates.set(DEFAULT_R2_ANNUAL_TEMPLATE.id, {
      ...DEFAULT_R2_ANNUAL_TEMPLATE,
      components: DEFAULT_R2_ANNUAL_TEMPLATE.components.map((c) => ({ ...c })),
      accIdRates: { ...DEFAULT_R2_ANNUAL_TEMPLATE.accIdRates },
    });
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (item && item.id) {
              this.templates.set(item.id, item);
            }
          }
          this.isLoadedFromStorage = true;
        }
      }
    } catch (err) {
      console.warn("[EstimationStore] Failed to load templates from localStorage:", err);
    }
  }

  private persist(): void {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      const arr = Array.from(this.templates.values());
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
    } catch (err) {
      console.warn("[EstimationStore] Failed to persist templates to localStorage:", err);
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.error("Error in EstimationStore listener:", err);
      }
    });
  }

  public getTemplate(id = "template-pajak-tahunan-r4"): EstimationTemplateConfig {
    const tpl = this.templates.get(id);
    if (!tpl) {
      if (id === DEFAULT_R2_ANNUAL_TEMPLATE.id) return DEFAULT_R2_ANNUAL_TEMPLATE;
      return DEFAULT_R4_ANNUAL_TEMPLATE;
    }
    return tpl;
  }

  public getAllTemplates(): EstimationTemplateConfig[] {
    return Array.from(this.templates.values());
  }

  public updateTemplateParams(
    id: string,
    updates: Partial<Omit<EstimationTemplateConfig, "id" | "components">>
  ): boolean {
    const tpl = this.templates.get(id);
    if (!tpl) return false;

    const updated: EstimationTemplateConfig = {
      ...tpl,
      ...updates,
      accIdRates: updates.accIdRates ? { ...tpl.accIdRates, ...updates.accIdRates } : tpl.accIdRates,
    };

    this.templates.set(id, updated);
    this.persist();
    this.notify();

    try {
      auditLog.log({
        userId: "usr-admin",
        userName: "Admin Estimasi",
        userRole: "admin",
        action: "UPDATE",
        module: "Estimasi",
        details: `Template parameter untuk ${tpl.name} diperbarui`,
        metadata: { templateId: id, updates },
      });
    } catch {
      // safe fallback
    }

    return true;
  }

  public updateComponentRule(
    templateId: string,
    componentId: string,
    updates: Partial<EstimationComponentRule>
  ): boolean {
    const tpl = this.templates.get(templateId);
    if (!tpl) return false;

    const idx = tpl.components.findIndex((c) => c.id === componentId);
    if (idx === -1) return false;

    const oldComp = tpl.components[idx];
    const updatedComp: EstimationComponentRule = {
      ...oldComp,
      ...updates,
    };

    tpl.components[idx] = updatedComp;
    this.templates.set(templateId, { ...tpl });
    this.persist();
    this.notify();

    try {
      auditLog.log({
        userId: "usr-admin",
        userName: "Admin Estimasi",
        userRole: "admin",
        action: "UPDATE",
        module: "Estimasi",
        details: `Komponen ${oldComp.name} pada ${tpl.name} diperbarui`,
        metadata: { templateId, componentId, updates },
      });
    } catch {
      // safe fallback
    }

    return true;
  }

  public addManualComponent(
    templateId: string,
    compData: Omit<EstimationComponentRule, "id" | "displayOrder"> & { id?: string }
  ): EstimationComponentRule | null {
    const tpl = this.templates.get(templateId);
    if (!tpl) return null;

    const id = compData.id || `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const maxOrder = tpl.components.reduce((max, c) => Math.max(max, c.displayOrder), 0);

    const newComp: EstimationComponentRule = {
      ...compData,
      id,
      displayOrder: maxOrder + 1,
      isEditable: true,
      valueType: "manual",
    };

    tpl.components.push(newComp);
    this.templates.set(templateId, { ...tpl });
    this.persist();
    this.notify();

    return newComp;
  }

  public removeManualComponent(templateId: string, componentId: string): boolean {
    const tpl = this.templates.get(templateId);
    if (!tpl) return false;

    const comp = tpl.components.find((c) => c.id === componentId);
    // Protect core formula components from being deleted
    if (!comp || comp.valueType === "formula" || comp.ruleId) {
      return false;
    }

    tpl.components = tpl.components.filter((c) => c.id !== componentId);
    this.templates.set(templateId, { ...tpl });
    this.persist();
    this.notify();
    return true;
  }

  public resetToDefault(templateId = "template-pajak-tahunan-r4"): void {
    if (templateId === DEFAULT_R4_ANNUAL_TEMPLATE.id) {
      this.templates.set(templateId, {
        ...DEFAULT_R4_ANNUAL_TEMPLATE,
        components: DEFAULT_R4_ANNUAL_TEMPLATE.components.map((c) => ({ ...c })),
        accIdRates: { ...DEFAULT_R4_ANNUAL_TEMPLATE.accIdRates },
      });
      this.persist();
      this.notify();
    } else if (templateId === DEFAULT_R2_ANNUAL_TEMPLATE.id) {
      this.templates.set(templateId, {
        ...DEFAULT_R2_ANNUAL_TEMPLATE,
        components: DEFAULT_R2_ANNUAL_TEMPLATE.components.map((c) => ({ ...c })),
        accIdRates: { ...DEFAULT_R2_ANNUAL_TEMPLATE.accIdRates },
      });
      this.persist();
      this.notify();
    }
  }

  public calculate(input: EstimationInput, templateId = "template-pajak-tahunan-r4"): EstimationResult {
    const template = this.getTemplate(templateId);
    return calculateEstimation(input, template, defaultRuleRegistry);
  }
}

export const estimationStore = new EstimationStore();

export function useEstimationStore() {
  const [, setTick] = useState(0);

  useEffect(() => {
    return estimationStore.subscribe(() => {
      setTick((t) => t + 1);
    });
  }, []);

  return estimationStore;
}
