import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { AlertTriangle } from "lucide-react";
import { cn } from "./ui/utils";

interface MutasiFieldProps {
  label: string;
  value: string;
  basePrice?: number;
  hargaDasar?: number;
  name?: string;
  onChange: (value: string) => void;
}

export function MutasiCostField({ label, value, basePrice, hargaDasar, onChange }: MutasiFieldProps) {
  const safeBasePrice = basePrice || hargaDasar || 0;
  const safeValue = value || "";
  const exceeds = parseFloat(safeValue || "0") > safeBasePrice;
  const difference = exceeds ? parseFloat(safeValue) - safeBasePrice : 0;

  return (
    <div className="space-y-1.5">
      <Label className="text-xs flex flex-col gap-0.5 text-foreground/80">
        {label}
        <span className="text-[11px] text-muted-foreground font-normal">
          Harga Dasar: Rp {safeBasePrice.toLocaleString('id-ID')}
        </span>
      </Label>
      <Input
        type="number"
        value={safeValue}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-9 text-sm font-mono tabular-nums",
          exceeds
            ? "border-destructive focus-visible:ring-destructive/30 bg-destructive/5 text-destructive"
            : ""
        )}
        placeholder="0"
      />
      {exceeds && (
        <p className="text-[11px] text-destructive flex items-center gap-1 font-medium mt-1">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          Melebihi Rp {difference.toLocaleString('id-ID')}
        </p>
      )}
    </div>
  );
}
