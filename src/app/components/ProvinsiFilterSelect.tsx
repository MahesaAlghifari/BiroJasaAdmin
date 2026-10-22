import { useMemo } from "react";
import { MapPin, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger } from "./ui/select";
import { PROVINSI_LIST } from "../../domain/pricing/wilayahIndonesiaData";
import { cn } from "./ui/utils";

export interface ProvinsiFilterSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  triggerClassName?: string;
  placeholder?: string;
}

export function ProvinsiFilterSelect({
  value,
  onValueChange,
  className,
  triggerClassName,
  placeholder = "Filter Provinsi",
}: ProvinsiFilterSelectProps) {
  const sortedProvinces = useMemo(() => {
    return [...PROVINSI_LIST].sort((a, b) =>
      a.nama_provinsi.localeCompare(b.nama_provinsi, "id", { sensitivity: "base" })
    );
  }, []);

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger
          className={cn(
            "w-full sm:w-56 h-8.5 text-xs bg-background border-border shrink-0",
            triggerClassName
          )}
        >
          <div className="flex items-center gap-1.5 truncate">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="truncate">
              {value === "all"
                ? "Semua Provinsi"
                : value === "unmapped"
                ? "Belum Terpetakan"
                : value}
            </span>
          </div>
        </SelectTrigger>
        <SelectContent className="max-h-72 z-50">
          <SelectItem value="all" className="text-xs font-medium">
            Semua Provinsi (38 Provinsi)
          </SelectItem>
          {sortedProvinces.map((prov) => (
            <SelectItem key={prov.kode_provinsi} value={prov.nama_provinsi} className="text-xs">
              {prov.nama_provinsi}
            </SelectItem>
          ))}
          <SelectItem value="unmapped" className="text-xs text-muted-foreground">
            Belum Terpetakan
          </SelectItem>
        </SelectContent>
      </Select>
      {value !== "all" && (
        <button
          type="button"
          onClick={() => onValueChange("all")}
          title="Kembali ke Semua Provinsi"
          className="h-8.5 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 border border-border rounded-md flex items-center gap-1 transition-colors shrink-0"
        >
          <X className="w-3 h-3" />
          <span className="hidden sm:inline">Reset</span>
        </button>
      )}
    </div>
  );
}
