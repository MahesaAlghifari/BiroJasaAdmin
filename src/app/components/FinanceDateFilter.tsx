import * as React from "react";
import { useState, useMemo } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Button } from "./ui/button";
import { Calendar } from "./ui/calendar";
import { cn } from "./ui/utils";

export type DateFilterMode = "hari" | "minggu" | "bulan" | "tahun";

export interface FinanceDateFilterValue {
  mode: DateFilterMode;
  selectedDate?: Date;       // for 'hari' and 'minggu'
  selectedMonth?: number;    // 0-11 for 'bulan'
  selectedYear?: number;     // e.g. 2024, 2025, 2026 for 'bulan' and 'tahun'
  label: string;
}

interface FinanceDateFilterProps {
  value: FinanceDateFilterValue | null;
  onChange: (value: FinanceDateFilterValue | null) => void;
  className?: string;
  defaultYear?: number;
}

const INDONESIAN_MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const INDONESIAN_MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
];

// Helper: Calculate week start (Monday) and end (Sunday)
export function getWeekRange(date: Date): { start: Date; end: Date; label: string } {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  // Monday as first day of week
  const diffToMonday = day === 0 ? -6 : 1 - day;
  
  const start = new Date(d);
  start.setDate(d.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  let label = "";
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    label = `${start.getDate()}–${end.getDate()} ${INDONESIAN_MONTHS[start.getMonth()]} ${start.getFullYear()}`;
  } else if (start.getFullYear() === end.getFullYear()) {
    label = `${start.getDate()} ${INDONESIAN_MONTHS[start.getMonth()]} – ${end.getDate()} ${INDONESIAN_MONTHS[end.getMonth()]} ${start.getFullYear()}`;
  } else {
    label = `${start.getDate()} ${INDONESIAN_MONTHS[start.getMonth()]} ${start.getFullYear()} – ${end.getDate()} ${INDONESIAN_MONTHS[end.getMonth()]} ${end.getFullYear()}`;
  }

  return { start, end, label };
}

export function FinanceDateFilter({
  value,
  onChange,
  className,
  defaultYear = 2025
}: FinanceDateFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeMode, setActiveMode] = useState<DateFilterMode>(value?.mode || "hari");

  // Navigation state for month & year pickers
  const [viewYear, setViewYear] = useState<number>(value?.selectedYear || defaultYear);

  // Month navigation for Day/Week calendar
  const [calendarMonth, setCalendarMonth] = useState<Date>(
    value?.selectedDate || new Date(defaultYear, 7, 1) // default to August 2025 (matching sample data)
  );

  // Handle mode switch
  const handleModeChange = (mode: DateFilterMode) => {
    setActiveMode(mode);
  };

  // 1. Day Mode selection
  const handleSelectDay = (date: Date | undefined) => {
    if (!date) return;
    const day = date.getDate();
    const month = INDONESIAN_MONTHS[date.getMonth()];
    const year = date.getFullYear();
    const label = `${day} ${month} ${year}`;

    onChange({
      mode: "hari",
      selectedDate: date,
      label
    });
    setIsOpen(false);
  };

  // 2. Week Mode selection
  const handleSelectWeek = (date: Date | undefined) => {
    if (!date) return;
    const { label } = getWeekRange(date);

    onChange({
      mode: "minggu",
      selectedDate: date,
      label
    });
    setIsOpen(false);
  };

  // 3. Month Mode selection
  const handleSelectMonth = (monthIndex: number) => {
    const label = `${INDONESIAN_MONTHS[monthIndex]} ${viewYear}`;
    onChange({
      mode: "bulan",
      selectedMonth: monthIndex,
      selectedYear: viewYear,
      label
    });
    setIsOpen(false);
  };

  // 4. Year Mode selection
  const handleSelectYear = (year: number) => {
    const label = `${year}`;
    onChange({
      mode: "tahun",
      selectedYear: year,
      label
    });
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  // Compute selected week range modifiers for week mode styling
  const weekRange = useMemo(() => {
    if (activeMode === "minggu" && value?.mode === "minggu" && value.selectedDate) {
      return getWeekRange(value.selectedDate);
    }
    return null;
  }, [activeMode, value]);

  // Year options list
  const yearOptions = [2023, 2024, 2025, 2026, 2027];

  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            aria-label="Pilih tanggal atau rentang filter"
            className={cn(
              "h-8 px-2.5 text-xs font-normal border-border gap-2 bg-background hover:bg-muted/40 transition-colors shadow-2xs rounded-md",
              className?.includes("w-full") && "w-full justify-between",
              value ? "border-primary/40 text-foreground bg-primary/5 font-medium" : "text-muted-foreground"
            )}
          >
            <div className="flex items-center gap-2 truncate">
              <CalendarIcon className={cn("w-3.5 h-3.5 shrink-0", value ? "text-primary" : "text-muted-foreground")} />
              <span className="truncate max-w-[220px]">
                {value ? value.label : "Pilih tanggal..."}
              </span>
            </div>
            {value && (
              <span
                role="button"
                tabIndex={0}
                onClick={handleClear}
                className="ml-0.5 p-0.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="Hapus filter tanggal"
              >
                <X className="w-3 h-3" />
              </span>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          className="w-auto max-w-[95vw] p-2.5 sm:p-3.5 bg-popover text-popover-foreground border border-border shadow-lg rounded-xl space-y-3"
        >
          {/* Header with Mode Switcher (Apple-style segmented control) */}
          <div className="flex items-center justify-between gap-3 border-b border-border/70 pb-2.5">
            <div className="inline-flex p-0.5 bg-muted/60 rounded-lg border border-border/50 text-[11px]">
              {(["hari", "minggu", "bulan", "tahun"] as DateFilterMode[]).map((mode) => {
                const labels: Record<DateFilterMode, string> = {
                  hari: "Hari",
                  minggu: "Minggu",
                  bulan: "Bulan",
                  tahun: "Tahun"
                };
                const isActive = activeMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => handleModeChange(mode)}
                    className={cn(
                      "px-2.5 py-1 rounded-md font-medium transition-all",
                      isActive
                        ? "bg-background text-foreground shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {labels[mode]}
                  </button>
                );
              })}
            </div>

            {value && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
              >
                Reset
              </Button>
            )}
          </div>

          {/* Mode 1: HARI */}
          {activeMode === "hari" && (
            <div className="space-y-2">
              <p className="text-[11px] text-muted-foreground px-1">
                Pilih satu tanggal transaksi
              </p>
              <Calendar
                mode="single"
                month={calendarMonth}
                onMonthChange={setCalendarMonth}
                selected={value?.mode === "hari" ? value.selectedDate : undefined}
                onSelect={handleSelectDay}
                className="rounded-lg border border-border/40 p-1"
              />
            </div>
          )}

          {/* Mode 2: MINGGU */}
          {activeMode === "minggu" && (
            <div className="space-y-2">
              <p className="text-[11px] text-muted-foreground px-1">
                Pilih tanggal untuk memfilter rentang 1 minggu penuh
              </p>
              <Calendar
                mode="single"
                month={calendarMonth}
                onMonthChange={setCalendarMonth}
                selected={value?.mode === "minggu" ? value.selectedDate : undefined}
                onSelect={handleSelectWeek}
                className="rounded-lg border border-border/40 p-1"
                modifiers={weekRange ? {
                  inWeek: (date) => date >= weekRange.start && date <= weekRange.end
                } : undefined}
                modifiersClassNames={{
                  inWeek: "bg-primary/10 text-primary font-medium rounded-sm"
                }}
              />
              {weekRange && (
                <div className="text-[11px] text-center text-foreground font-medium py-1 bg-muted/30 rounded-md border border-border/40">
                  Rentang minggu: {weekRange.label}
                </div>
              )}
            </div>
          )}

          {/* Mode 3: BULAN */}
          {activeMode === "bulan" && (
            <div className="space-y-3 w-[260px]">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-medium text-foreground">Pilih Bulan</span>
                {/* Year selector */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setViewYear(y => y - 1)}
                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs font-semibold text-foreground px-1">{viewYear}</span>
                  <button
                    type="button"
                    onClick={() => setViewYear(y => y + 1)}
                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 12 months grid */}
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                {INDONESIAN_MONTHS_SHORT.map((mShort, idx) => {
                  const isSelected = value?.mode === "bulan" && value.selectedMonth === idx && value.selectedYear === viewYear;
                  return (
                    <button
                      key={mShort}
                      type="button"
                      onClick={() => handleSelectMonth(idx)}
                      className={cn(
                        "py-2 px-1 text-xs rounded-lg transition-colors font-medium border text-center",
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                          : "bg-background hover:bg-muted/60 text-foreground border-border/50"
                      )}
                    >
                      {mShort}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Mode 4: TAHUN */}
          {activeMode === "tahun" && (
            <div className="space-y-3 w-[240px]">
              <p className="text-[11px] text-muted-foreground px-1">
                Pilih tahun transaksi
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                {yearOptions.map((yr) => {
                  const isSelected = value?.mode === "tahun" && value.selectedYear === yr;
                  return (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => handleSelectYear(yr)}
                      className={cn(
                        "py-2.5 px-3 text-xs rounded-lg transition-colors font-medium border flex items-center justify-between",
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                          : "bg-background hover:bg-muted/60 text-foreground border-border/50"
                      )}
                    >
                      <span>{yr}</span>
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
