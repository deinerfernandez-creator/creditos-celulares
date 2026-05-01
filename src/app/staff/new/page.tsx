
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShieldCheck, ChevronLeft, Mail, User, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useFirestore, useUser } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export default function NewStaffPage() {
  const router = useRouter();
  const { toast } = useToast();
  const db = useFirestore();
  const { role, loading: authLoading } = useUser();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'vendedor',
    uid: '' // El ID de usuario debe ser obtenido tras crear el usuario en Auth manualmente o vía consola
  });

  useEffect(() => {
    if (!authLoading && role !== 'admin') {
      toast({
        title: "Acceso Denegado",
        description: "Solo administradores pueden acceder a esta sección.",
        variant: "destructive"
      });
      router.push('/');
    }
  }, [role, authLoading, router, toast]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.role || !formData.uid) {
      toast({
        title: "Campos faltantes",
        description: "Debes ingresar el Email, Rol y el UID del usuario (desde la consola de Firebase).",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    const staffData = {
      name: formData.name,
      email: formData.email,
      role: formData.role,
      uid: formData.uid,
      createdAt: serverTimestamp(),
    };

    // Guardamos el permiso en la colección de usuarios habilitados
    setDoc(doc(db, 'users', formData.uid), staffData)
      .then(() => {
        toast({
          title: "Personal Registrado",
          description: `Se han asignado permisos de ${formData.role} a ${formData.email}.`,
        });
        router.push('/');
      })
      .catch((error: any) => {
        toast({
          title: "Error",
          description: "No se pudieron asignar los permisos: " + error.message,
          variant: "destructive"
        });
        setLoading(false);
      });
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 flex items-center justify-center">
      <div className="w-full max-w-xl space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="rounded-full">
            <Link href="/"><ChevronLeft className="w-5 h-5" /></Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Habilitar Nuevo Personal</h1>
        </div>

        <Card className="border-none shadow-xl">
          <CardHeader className="bg-primary text-white rounded-t-xl pb-8">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-8 h-8" />
              <div>
                <CardTitle>Permisos de Acceso</CardTitle>
                <CardDescription className="text-white/70">Asigna roles administrativos o de ventas</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-8">
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3 text-amber-800 text-xs leading-relaxed">
              <ShieldAlert className="w-5 h-5 shrink-0 text-amber-500" />
              <div>
                <p className="font-bold">Instrucciones Importantes:</p>
                <p className="mt-1">1. Crea primero el usuario en la <strong>Consola de Firebase > Authentication</strong>.</p>
                <p>2. Copia el <strong>User UID</strong> generado.</p>
                <p>3. Pégalo aquí para habilitar su acceso al panel.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="uid">User UID (de Firebase Auth)</Label>
                <div className="relative">
                  <Input 
                    id="uid" 
                    placeholder="Ejem: gHZ9n7s2b9X8fJ2kP3s5t8YxVOE2" 
                    className="rounded-xl h-12 font-mono text-xs"
                    value={formData.uid}
                    onChange={(e) => setFormData({...formData, uid: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre (Opcional)</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      id="name" 
                      placeholder="Nombre del empleado" 
                      className="pl-10 rounded-xl h-12"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Correo Electrónico</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      id="email" 
                      type="email"
                      placeholder="empleado@tecnicell.com" 
                      className="pl-10 rounded-xl h-12"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Rol en el Sistema</Label>
                <Select value={formData.role} onValueChange={(val) => setFormData({...formData, role: val})}>
                  <SelectTrigger className="rounded-xl h-12">
                    <SelectValue placeholder="Selecciona un rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vendedor">Vendedor (Gestión de créditos)</SelectItem>
                    <SelectItem value="admin">Administrador (Acceso total)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl text-lg font-bold shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 text-white">
                {loading ? "Asignando..." : "Habilitar Usuario"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
