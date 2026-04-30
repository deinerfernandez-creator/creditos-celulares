"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Smartphone, User, ArrowRight, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { MOCK_CUSTOMERS } from '@/lib/mock-data';

export default function PortalLoginPage() {
  const [customerId, setCustomerId] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleAccess = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulamos una validación de cliente
    const customer = MOCK_CUSTOMERS.find(c => c.id === customerId);
    
    setTimeout(() => {
      if (customer) {
        toast({
          title: "¡Bienvenido!",
          description: `Hola ${customer.name}, estamos cargando tu información.`,
        });
        router.push(`/portal/${customerId}`);
      } else {
        toast({
          title: "Error de acceso",
          description: "No encontramos ningún cliente con ese ID. Prueba con '1'.",
          variant: "destructive"
        });
        setLoading(false);
      }
    }, 800);
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
            <CardDescription>Ingresa tu número de cliente para continuar</CardDescription>
          </CardHeader>
          <CardContent className="pt-8">
            <form onSubmit={handleAccess} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="customerId">ID de Cliente</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    id="customerId" 
                    placeholder="Ej: 1" 
                    className="pl-10 h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white transition-all"
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    required
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={loading}
                className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-lg shadow-lg shadow-primary/20"
              >
                {loading ? 'Validando...' : (
                  <span className="flex items-center gap-2">
                    Ingresar a mi cuenta <ArrowRight className="w-5 h-5" />
                  </span>
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="bg-slate-50/50 p-6 text-center border-t">
            <p className="text-xs text-slate-500 w-full">
              ¿No conoces tu ID? Por favor contacta a soporte técnico en tienda.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
