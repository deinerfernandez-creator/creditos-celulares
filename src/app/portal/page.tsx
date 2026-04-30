"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Smartphone, User, ArrowRight, ShieldCheck, Hash } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { MOCK_CUSTOMERS, MOCK_CREDITS } from '@/lib/mock-data';

export default function PortalLoginPage() {
  const [cedula, setCedula] = useState('');
  const [imei, setImei] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleAccess = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Buscar cliente por cédula
    const customer = MOCK_CUSTOMERS.find(c => c.cedula === cedula);
    
    setTimeout(() => {
      if (customer) {
        // Verificar si existe un crédito para este cliente con ese IMEI
        const credit = MOCK_CREDITS.find(c => c.customerId === customer.id && c.imei === imei);
        
        if (credit) {
          toast({
            title: "¡Acceso exitoso!",
            description: `Hola ${customer.name}, bienvenido a tu portal de pagos.`,
          });
          router.push(`/portal/${customer.id}`);
        } else {
          toast({
            title: "Error de validación",
            description: "El IMEI no coincide con ningún equipo registrado a tu nombre.",
            variant: "destructive"
          });
          setLoading(false);
        }
      } else {
        toast({
          title: "Cliente no encontrado",
          description: "No encontramos registros con el número de cédula ingresado.",
          variant: "destructive"
        });
        setLoading(false);
      }
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-primary rounded-2xl text-white mb-2 shadow-lg shadow-primary/20">
            <Smartphone className="w-8 h-8" />
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
                    placeholder="0000-0000-00000" 
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
                    placeholder="15 dígitos" 
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
                className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-lg shadow-lg shadow-primary/20"
              >
                {loading ? 'Verificando...' : (
                  <span className="flex items-center gap-2">
                    Ingresar a mi cuenta <ArrowRight className="w-5 h-5" />
                  </span>
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="bg-slate-50/50 p-6 text-center border-t">
            <div className="text-xs text-slate-500 w-full space-y-1">
              <p>¿Problemas para acceder? Contacta a soporte.</p>
              <div className="pt-2 flex justify-center gap-2 text-[10px] font-mono opacity-50">
                <span>Demo Cédula: 0801-1990-12345</span>
                <span>Demo IMEI: 358901234567890</span>
              </div>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}