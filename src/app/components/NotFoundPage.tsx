import { useNavigate } from "react-router";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { FileQuestion, ArrowLeft } from "lucide-react";

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <Card className="max-w-md w-full p-8 border border-border shadow-xs bg-card space-y-5 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-2xs">
          <FileQuestion className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <span className="text-xs font-mono font-semibold text-primary tracking-wider uppercase">
            Error 404
          </span>
          <h2 className="text-xl font-bold text-foreground tracking-tight">
            Halaman Tidak Ditemukan
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Halaman yang Anda tuju tidak ditemukan atau URL yang dimasukkan salah.
          </p>
        </div>
        <Button
          onClick={() => navigate("/dashboard")}
          className="w-full gap-2 text-xs font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Dashboard</span>
        </Button>
      </Card>
    </div>
  );
}
