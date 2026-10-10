import { useState } from "react";
import { motion } from "motion/react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Separator } from "./ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Bell, Shield, Database, Key, Save } from "lucide-react";
import { toast } from "sonner";

export function Settings() {
  const [notifications, setNotifications] = useState({
    emailNotif: true,
    whatsappNotif: true,
    tagihanReminder: true,
    orderUpdate: false,
  });

  const handleSave = () => {
    toast.success("Pengaturan berhasil disimpan!");
  };

  return (
    <div className="space-y-4 p-4 md:p-5">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-xl font-semibold text-foreground tracking-tight">
          Pengaturan
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Kelola preferensi dan konfigurasi sistem</p>
      </motion.div>

      <Tabs defaultValue="notifications" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 gap-2 bg-secondary/30 p-2">
          <TabsTrigger value="notifications">
            <Bell className="w-4 h-4 mr-2" />
            Notifikasi
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="w-4 h-4 mr-2" />
            Keamanan
          </TabsTrigger>
          <TabsTrigger value="advanced">
            <Database className="w-4 h-4 mr-2" />
            Lanjutan
          </TabsTrigger>
        </TabsList>

        {/* Notifications */}
        <TabsContent value="notifications">
          <Card className="p-4 sm:p-5 border border-border/80 bg-card shadow-xs">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-4">Pengaturan Notifikasi</h3>
                <Separator className="mb-4" />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/20">
                  <div>
                    <p className="font-medium text-foreground">Notifikasi Email</p>
                    <p className="text-sm text-muted-foreground">Terima pemberitahuan melalui email</p>
                  </div>
                  <Switch 
                    checked={notifications.emailNotif}
                    onCheckedChange={(checked) => setNotifications({...notifications, emailNotif: checked})}
                    aria-label="Notifikasi Email"
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/20">
                  <div>
                    <p className="font-medium text-foreground">Notifikasi WhatsApp</p>
                    <p className="text-sm text-muted-foreground">Terima pemberitahuan melalui WhatsApp</p>
                  </div>
                  <Switch 
                    checked={notifications.whatsappNotif}
                    onCheckedChange={(checked) => setNotifications({...notifications, whatsappNotif: checked})}
                    aria-label="Notifikasi WhatsApp"
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/20">
                  <div>
                    <p className="font-medium text-foreground">Reminder Tagihan</p>
                    <p className="text-sm text-muted-foreground">Pengingat otomatis untuk tagihan jatuh tempo</p>
                  </div>
                  <Switch 
                    checked={notifications.tagihanReminder}
                    onCheckedChange={(checked) => setNotifications({...notifications, tagihanReminder: checked})}
                    aria-label="Reminder Tagihan Otomatis"
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/20">
                  <div>
                    <p className="font-medium text-foreground">Update Order</p>
                    <p className="text-sm text-muted-foreground">Notifikasi setiap ada perubahan status order</p>
                  </div>
                  <Switch 
                    checked={notifications.orderUpdate}
                    onCheckedChange={(checked) => setNotifications({...notifications, orderUpdate: checked})}
                    aria-label="Notifikasi Update Status Order"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleSave}>
                  <Save className="w-4 h-4 mr-2" />
                  Simpan Perubahan
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security">
          <Card className="p-4 sm:p-5 border border-border/80 bg-card shadow-xs">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-4">Keamanan Akun</h3>
                <Separator className="mb-4" />
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="old-password" className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    Password Lama
                  </Label>
                  <Input id="old-password" type="password" placeholder="Masukkan password lama" className="bg-input-background border-border" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password">Password Baru</Label>
                  <Input id="new-password" type="password" placeholder="Masukkan password baru" className="bg-input-background border-border" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-new-password">Konfirmasi Password Baru</Label>
                  <Input id="confirm-new-password" type="password" placeholder="Konfirmasi password baru" className="bg-input-background border-border" />
                </div>

                <Separator className="my-4" />

                <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/20">
                  <div>
                    <p className="font-medium text-foreground">Two-Factor Authentication</p>
                    <p className="text-sm text-muted-foreground">Keamanan tambahan dengan 2FA</p>
                  </div>
                  <Switch aria-label="Aktifkan autentikasi dua faktor (2FA)" />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleSave}>
                  <Save className="w-4 h-4 mr-2" />
                  Update Password
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Advanced */}
        <TabsContent value="advanced">
          <Card className="p-4 sm:p-5 border border-border/80 bg-card shadow-xs">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-4">Pengaturan Lanjutan</h3>
                <Separator className="mb-4" />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/20">
                  <div>
                    <p className="font-medium text-foreground">Debug Mode</p>
                    <p className="text-sm text-muted-foreground">Tampilkan informasi debugging</p>
                  </div>
                  <Switch aria-label="Mode debugging" />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/20">
                  <div>
                    <p className="font-medium text-foreground">Auto Backup</p>
                    <p className="text-sm text-muted-foreground">Backup data otomatis setiap hari</p>
                  </div>
                  <Switch defaultChecked aria-label="Backup data otomatis setiap hari" />
                </div>

                <div className="space-y-2">
                  <Label id="items-per-page-label">Items Per Page</Label>
                  <Select defaultValue="10">
                    <SelectTrigger aria-labelledby="items-per-page-label" className="bg-input-background border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 items</SelectItem>
                      <SelectItem value="25">25 items</SelectItem>
                      <SelectItem value="50">50 items</SelectItem>
                      <SelectItem value="100">100 items</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator className="my-4" />

                <Card className="p-4 sm:p-5 border border-destructive/20 bg-destructive/5 shadow-2xs">
                  <h4 className="text-destructive font-semibold mb-2">Danger Zone</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Tindakan berikut dapat menghapus data secara permanen
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10">
                      Clear Cache
                    </Button>
                    <Button variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10">
                      Reset Settings
                    </Button>
                  </div>
                </Card>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleSave}>
                  <Save className="w-4 h-4 mr-2" />
                  Simpan Perubahan
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
