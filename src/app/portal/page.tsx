
"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, ArrowRight, ShieldCheck, Hash, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function PortalLoginPage() {
  const [cedula, setCedula] = useState('');
  const [imei, setImei] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const db = useFirestore();
  
  const logo = PlaceHolderImages.find(img => img.id === 'logo-tecnicell');

  const handleAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cedula || !imei) return;
    
    setLoading(true);
    
    try {
      // 1. Buscar cliente por cédula
      const customersRef = collection(db, 'customers');
      const qCustomer = query(customersRef, where("cedula", "==", cedula));
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

      // 2. Buscar crédito con ese IMEI para ese cliente
      const creditsRef = collection(db, 'credits');
      const qCredit = query(
        creditsRef, 
        where("customerId", "==", customerId),
        where("imei", "==", imei)
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
      toast({
        title: "Error de conexión",
        description: "No se pudo validar el acceso. Revisa tu conexión.",
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex p-1 bg-white rounded-3xl mb-2 shadow-xl shadow-primary/10 overflow-hidden w-24 h-24 items-center justify-center border-4 border-primary/5">
            <Image 
              src={logo?.imageUrl || '/logo.png'} 
              alt="Tecnicell Logo" 
              width={80} 
              height={80}
              className="object-contain"
            />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Tecnicell Portal</h1>
          <p className="text-slate-500">Consulta el estado de tu crédito en segundos</p>
        </div>

        <Card className="border-none shadow-2xl shadow-slate-200/50 bg-white rounded-3xl overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b pb-6">
            <CardTitle className="text-xl flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              Acceso Seguro
            </CardTitle>
            <CardDescription>Valida tu identidad para ver tu plan de pagos</CardDescription>
          </CardHeader>
          <CardContent className="pt-8">
            <form onSubmit={handleAccess} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="cedula">Número de Cédula</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    id="cedula" 
                    placeholder="Tu cédula registrada" 
                    className="pl-10 h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white transition-all"
                    value={cedula}
                    onChange={(e) => setCedula(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="imei">IMEI del Teléfono</Label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    id="imei" 
                    placeholder="15 dígitos de tu equipo" 
                    className="pl-10 h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white transition-all"
                    value={imei}
                    onChange={(e) => setImei(e.target.value)}
                    required
                  />
                </div>
                <p className="text-[10px] text-muted-foreground px-1">
                  Marca *#06# en tu equipo para obtener el IMEI.
                </p>
              </div>

              <Button 
                type="submit" 
                disabled={loading}
                className="w-full h-14 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-lg shadow-lg shadow-primary/20"
              >
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <span className="flex items-center gap-2">
                    Ingresar a mi cuenta <ArrowRight className="w-5 h-5" />
                  </span>
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="bg-slate-50/50 p-6 text-center border-t">
            <p className="text-xs text-slate-500 w-full">
              ¿Problemas para acceder? Contacta a soporte de Tecnicell.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
