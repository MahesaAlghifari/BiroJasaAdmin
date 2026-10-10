import { useState } from "react";
import { motion } from "motion/react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Separator } from "./ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { User, Mail, Phone, MapPin, Building, Edit, Save, Camera } from "lucide-react";
import { toast } from "sonner";

interface ProfileProps {
  userRole?: 'admin' | 'messenger';
}

export function Profile({ userRole = 'admin' }: ProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  
  // Default profile data based on role
  const getDefaultProfile = () => {
    if (userRole === 'messenger') {
      return {
        name: "Messenger Biro Jasa",
        email: "messenger@birojasa.com",
        phone: "08123456789",
        address: "Jl. Sudirman No. 123, Jakarta Selatan",
        company: "PT. Biro Jasa Indonesia",
        position: "Messenger",
        bio: "Menjalankan tugas pengambilan dan pengantaran dokumen kendaraan bermotor dengan pengalaman lebih dari 3 tahun.",
      };
    }
    return {
      name: "Admin Biro Jasa",
      email: "admin@birojasa.com",
      phone: "08123456789",
      address: "Jl. Sudirman No. 123, Jakarta Selatan",
      company: "PT. Biro Jasa Indonesia",
      position: "Administrator",
      bio: "Mengelola sistem biro jasa kendaraan bermotor dengan pengalaman lebih dari 5 tahun.",
    };
  };

  const [profileData, setProfileData] = useState(getDefaultProfile());

  const handleSave = () => {
    setIsEditing(false);
    toast.success("Profil berhasil diupdate!");
  };

  return (
    <div className="space-y-4 p-4 md:p-5">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-xl font-semibold text-foreground tracking-tight">
          Profil Saya
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Kelola informasi profil dan akun Anda</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-4 sm:p-5 border border-border/80 bg-card shadow-xs">
            <div className="flex flex-col items-center text-center">
              {/* Avatar */}
              <div className="relative group mb-4">
                <Avatar className="w-32 h-32 border-4 border-primary/20">
                  <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=admin" />
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-semibold">
                    AB
                  </AvatarFallback>
                </Avatar>
                <Button 
                  size="sm"
                  aria-label="Ubah foto profil"
                  className="absolute bottom-0 right-0 rounded-full w-9 h-9 p-0 bg-primary hover:bg-primary/90 text-primary-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity shadow-sm"
                >
                  <Camera className="w-4 h-4" />
                </Button>
              </div>

              {/* Name & Position */}
              <h3 className="text-xl font-semibold text-foreground mb-1">{profileData.name}</h3>
              <p className="text-sm text-muted-foreground mb-3">{profileData.position}</p>
              <Badge status={userRole === 'messenger' ? 'messenger' : 'administrator'} className="mb-4">
                {userRole === 'messenger' ? 'Messenger' : 'Administrator'}
              </Badge>

              <Separator className="my-4" />

              {/* Quick Stats */}
              <div className="w-full space-y-3">
                <Card className="p-3 bg-muted/40 border border-border">
                  <p className="text-xs text-muted-foreground">Member Sejak</p>
                  <p className="text-sm font-medium text-foreground">Januari 2020</p>
                </Card>
                <Card className="p-3 bg-muted/40 border border-border">
                  <p className="text-xs text-muted-foreground">Total Order</p>
                  <p className="text-sm font-medium font-mono tabular-nums text-foreground">1,247 orders</p>
                </Card>
                <Card className="p-3 bg-muted/40 border border-border">
                  <p className="text-xs text-muted-foreground">Rating</p>
                  <p className="text-sm font-medium font-mono tabular-nums text-foreground">⭐ 4.9/5.0</p>
                </Card>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Profile Details */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2"
        >
          <Card className="p-4 sm:p-5 border border-border/80 bg-card shadow-xs">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-foreground">Informasi Profil</h3>
              {!isEditing ? (
                <Button 
                  onClick={() => setIsEditing(true)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Profil
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Batal
                  </Button>
                  <Button 
                    onClick={handleSave}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Simpan
                  </Button>
                </div>
              )}
            </div>

            <Separator className="mb-6" />

            <div className="space-y-4">
              {/* Personal Information */}
              <div>
                <h4 className="text-sm text-muted-foreground mb-4">Data Pribadi</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="profile-name" className="flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-400" />
                      Nama Lengkap
                    </Label>
                    {isEditing ? (
                      <Input 
                        id="profile-name"
                        value={profileData.name}
                        onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                        className="bg-input-background border-border"
                      />
                    ) : (
                      <p className="p-2 text-sm">{profileData.name}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="profile-email" className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      Email
                    </Label>
                    {isEditing ? (
                      <Input 
                        id="profile-email"
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                        className="bg-input-background border-border"
                      />
                    ) : (
                      <p className="p-2 text-sm">{profileData.email}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="profile-phone" className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      Nomor Telepon
                    </Label>
                    {isEditing ? (
                      <Input 
                        id="profile-phone"
                        value={profileData.phone}
                        onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                        className="bg-input-background border-border"
                      />
                    ) : (
                      <p className="p-2 text-sm">{profileData.phone}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="profile-company" className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      Perusahaan
                    </Label>
                    {isEditing ? (
                      <Input 
                        id="profile-company"
                        value={profileData.company}
                        onChange={(e) => setProfileData({...profileData, company: e.target.value})}
                        className="bg-input-background border-border"
                      />
                    ) : (
                      <p className="p-2 text-sm">{profileData.company}</p>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Address */}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-4">Alamat</h4>
                <div className="space-y-2">
                  <Label htmlFor="profile-address" className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                    Alamat Lengkap
                  </Label>
                  {isEditing ? (
                    <Textarea
                      id="profile-address"
                      value={profileData.address}
                      onChange={(e) => setProfileData({...profileData, address: e.target.value})}
                      className="bg-input-background border-border resize-none"
                      rows={2}
                    />
                  ) : (
                    <p className="p-2 text-sm">{profileData.address}</p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Bio */}
              <div>
                <h4 className="text-sm text-muted-foreground mb-4">Tentang Saya</h4>
                <div className="space-y-2">
                  <Label htmlFor="profile-bio">Bio</Label>
                  {isEditing ? (
                    <Textarea
                      id="profile-bio"
                      value={profileData.bio}
                      onChange={(e) => setProfileData({...profileData, bio: e.target.value})}
                      className="bg-input-background border-border resize-none"
                      rows={3}
                    />
                  ) : (
                    <p className="p-2 text-sm text-muted-foreground">{profileData.bio}</p>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Activity Log */}
          <Card className="p-4 sm:p-5 border border-border/80 bg-card shadow-xs mt-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Aktivitas Terakhir</h3>
            <Separator className="mb-4" />
            <div className="space-y-3">
              {(userRole === 'messenger' ? [
                { action: "Jemput dokumen dari klien", time: "2 jam yang lalu", icon: "📄" },
                { action: "Proses dokumen di Samsat", time: "4 jam yang lalu", icon: "🏢" },
                { action: "Antar dokumen ke klien", time: "1 hari yang lalu", icon: "🚗" },
                { action: "Selesai task pengantaran", time: "2 hari yang lalu", icon: "✅" },
              ] : [
                { action: "Login ke sistem", time: "2 jam yang lalu", icon: "🔐" },
                { action: "Menambahkan order baru", time: "5 jam yang lalu", icon: "📝" },
                { action: "Update data tagihan", time: "1 hari yang lalu", icon: "💰" },
                { action: "Export laporan keuangan", time: "2 hari yang lalu", icon: "📊" },
              ]).map((activity, idx) => (
                <Card key={idx} className="p-3 border border-border/80 bg-card shadow-2xs flex items-center gap-3">
                  <div className="text-2xl">{activity.icon}</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
