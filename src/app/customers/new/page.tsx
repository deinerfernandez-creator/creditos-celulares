"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Users, ChevronLeft, Mail, Phone, MapPin, Fingerprint } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function NewCustomerPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    name: '',
    cedula: '',
    email: '',
    phone: '',
    address: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.cedula) {
      toast({
        title: "Error",
        description: "Nombre, Cédula y Teléfono son obligatorios.",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Éxito",
      description: "Cliente registrado correctamente.",
    });
    
    setTimeout(() => router.push('/'), 1500);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 flex items-center justify-center">
      <div className="w-full max-w-2xl space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="rounded-full">
            <Link href="/"><ChevronLeft className="w-5 h-5" /></Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Registro de Nuevo Cliente</h1>
        </div>

        <Card className="border-none shadow-xl shadow-primary/5">
          <CardHeader className="bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary rounded-xl text-white">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <CardTitle>Perfil del Cliente</CardTitle>
                <CardDescription>Información de contacto para gestión de créditos</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre Completo</Label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      id="name" 
                      placeholder="Juan Pérez" 
                      className="pl-10 rounded-xl h-12"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cedula">Número de Cédula</Label>
                  <div className="relative">
                    <Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      id="cedula" 
                      placeholder="0000-0000-00000" 
                      className="pl-10 rounded-xl h-12"
                      value={formData.cedula}
                      onChange={(e) => setFormData({...formData, cedula: e.target.value})}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Correo Electrónico</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      id="email" 
                      type="email"
                      placeholder="juan@email.com" 
                      className="pl-10 rounded-xl h-12"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono / WhatsApp</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      id="phone" 
                      placeholder="+504 9999-9999" 
                      className="pl-10 rounded-xl h-12"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Dirección de Domicilio</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Textarea 
                    id="address" 
                    placeholder="Colonia, Calle, Número de casa..." 
                    className="pl-10 rounded-xl min-h-[100px] pt-3"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full h-12 rounded-xl text-lg font-bold shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 text-white">
                Guardar Cliente
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
