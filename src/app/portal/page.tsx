"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, ArrowRight, ShieldCheck, Hash, Loader2, LayoutDashboard, Smartphone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Link from 'next/link';

export default function PortalLoginPage() {
  const [cedula, setCedula] = useState('');
  const [imei, setImei] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const db = useFirestore();
  
  const logo = PlaceHolderImages.find(img => img.id === 'logo-tecnicell');

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cedula || !imei) return;
    
    setLoading(true);
    
    try {
      // 1. Buscar al cliente por cédula
      const customersRef = collection(db, 'customers');
      const qCustomer = query(customersRef, where("cedula", "==", cedula.trim()));
      const customerSnap = await getDocs(qCustomer);
      
      if (customerSnap.empty) {
        toast({
          title: "Acceso denegado",
          description: "No encontramos un cliente con esa cédula.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      const customerDoc = customerSnap.docs[0];
      const customerId = customerDoc.id;

      // 2. Validar que el IMEI pertenezca a un crédito de ese cliente
      const creditsRef = collection(db, 'credits');
      const qCredit = query(
        creditsRef, 
        where("customerId", "==", customerId),
        where("imei", "==", imei.trim())
      );
      const creditSnap = await getDocs(qCredit);

      if (creditSnap.empty) {
        toast({
          title: "Validación fallida",
          description: "El IMEI no coincide con ningún equipo a tu nombre.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      toast({
        title: "¡Bienvenido!",
        description: "Accediendo a tu estado de cuenta...",
      });
      
      router.push(`/portal/${customerId}`);
    } catch (error: any) {
      console.error("Portal access error:", error);
      toast({
        title: "Error de conexión",
        description: "No se pudo validar el acceso. Revisa tu conexión.",
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md mb-8 flex justify-between items-center">
        <Button variant="ghost" size="sm" asChild className="rounded-xl text-slate-500 hover:text-primary">
          <Link href="/">
            <LayoutDashboard className="w-4 h-4 mr-2" /> Panel Staff
          </Link>
        </Button>
      </div>

      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex p-1 bg-white rounded-3xl shadow-xl shadow-primary/10 overflow-hidden w-24 h-24 items-center justify-center border-4 border-primary/5">
            <Image 
              src={logo?.imageUrl || '/logo.png'} 
              alt="Tecnicell Logo" 
              width={80} 
              height={80}
              className="object-contain"
            />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Portal de Clientes</h1>
            <p className="text-slate-500 text-sm font-medium">Gestiona tu crédito y consulta tus abonos</p>
          </div>
        </div>

        <Card className="border-none shadow-2xl shadow-slate-200/50 bg-white rounded-3xl overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b pb-6">
            <CardTitle className="text-lg flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              Validación de Identidad
            </CardTitle>
            <CardDescription className="text-xs">Introduce tus datos registrados al momento de la compra</CardDescription>
          </CardHeader>
          <CardContent className="pt-8">
            <form onSubmit={handleAccess} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="cedula" className="text-xs font-black uppercase text-slate-400 tracking-widest">Número de Cédula</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    id="cedula" 
                    placeholder="Ej: 0801199012345" 
                    className="pl-10 h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white transition-all font-medium"
                    value={cedula}
                    onChange={(e) => setCedula(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="imei" className="text-xs font-black uppercase text-slate-400 tracking-widest">IMEI del Teléfono</Label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    id="imei" 
                    placeholder="Los 15 dígitos de tu equipo" 
                    className="pl-10 h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white transition-all font-mono text-sm"
                    value={imei}
                    onChange={(e) => setImei(e.target.value)}
                    required
                  />
                </div>
                <div className="flex items-center gap-2 mt-2 px-1">
                  <Smartphone className="w-3 h-3 text-primary" />
                  <p className="text-[10px] text-muted-foreground">
                    Marca <strong>*#06#</strong> en tu celular para conocer tu IMEI.
                  </p>
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={loading}
                className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold text-lg shadow-lg shadow-primary/20 transition-all"
              >
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <span className="flex items-center gap-2">
                    Ingresar al Portal <ArrowRight className="w-5 h-5" />
                  </span>
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="bg-slate-50/50 p-6 text-center border-t">
            <p className="text-[10px] text-slate-400 w-full uppercase font-bold tracking-tighter">
              Tecnicell Créditos - Todos los derechos reservados
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}