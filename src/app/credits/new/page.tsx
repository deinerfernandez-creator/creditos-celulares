
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Smartphone, ChevronLeft, Calendar, Info, Hash } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useFirestore, useCollection } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';

export default function NewCreditPage() {
  const router = useRouter();
  const { toast } = useToast();
  const db = useFirestore();
  
  // Fetch real customers
  const customersQuery = query(collection(db, 'customers'), orderBy('name', 'asc'));
  const { data: customers } = useCollection(customersQuery);

  const [loading, setLoading] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [deviceModel, setDeviceModel] = useState('');
  const [imei, setImei] = useState('');
  const [initialAmount, setInitialAmount] = useState('');
  const [planType, setPlanType] = useState<'6' | '12'>('6');
  
  const [calculation, setCalculation] = useState({
    interestRate: 0,
    totalAmount: 0,
    installmentAmount: 0
  });

  useEffect(() => {
    const amount = parseFloat(initialAmount) || 0;
    if (amount > 0) {
      const interest = planType === '6' ? 0.5 : 1.0;
      const total = amount * (1 + interest);
      const installments = planType === '6' ? 6 : 12;
      const installment = total / installments;

      setCalculation({
        interestRate: interest * 100,
        totalAmount: total,
        installmentAmount: Math.round(installment * 100) / 100
      });
    } else {
      setCalculation({ interestRate: 0, totalAmount: 0, installmentAmount: 0 });
    }
  }, [initialAmount, planType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !deviceModel || !imei || !initialAmount) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos.",
        variant: "destructive"
      });
      return;
    }

    if (imei.length < 15) {
      toast({
        title: "IMEI Inválido",
        description: "El IMEI debe tener al menos 15 dígitos.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'credits'), {
        customerId,
        deviceModel,
        imei,
        initialAmount: parseFloat(initialAmount),
        totalAmount: calculation.totalAmount,
        planType: parseInt(planType),
        installmentAmount: calculation.installmentAmount,
        remainingBalance: calculation.totalAmount,
        status: 'activo',
        createdAt: serverTimestamp(),
      });

      toast({
        title: "Éxito",
        description: "Crédito registrado correctamente.",
      });
      
      router.push('/');
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo crear el crédito: " + error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 flex items-center justify-center">
      <div className="w-full max-w-5xl space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="rounded-full">
            <Link href="/"><ChevronLeft className="w-5 h-5" /></Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Nueva Solicitud de Crédito</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 border-none shadow-xl shadow-primary/5">
            <CardHeader className="border-b bg-slate-50/50">
              <CardTitle className="text-lg">Información del Crédito</CardTitle>
              <CardDescription>Detalles del cliente y el equipo financiado</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="customer">Cliente</Label>
                    <Select onValueChange={setCustomerId} disabled={loading} required>
                      <SelectTrigger className="rounded-xl h-12">
                        <SelectValue placeholder="Selecciona un cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers?.map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>{c.name} ({c.cedula})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="device">Modelo de Celular</Label>
                    <div className="relative">
                      <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        id="device" 
                        placeholder="Ej: iPhone 15 Pro" 
                        className="pl-10 rounded-xl h-12"
                        value={deviceModel}
                        onChange={(e) => setDeviceModel(e.target.value)}
                        disabled={loading}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="imei">IMEI del Equipo</Label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        id="imei" 
                        placeholder="15 dígitos del equipo" 
                        className="pl-10 rounded-xl h-12 font-mono text-sm"
                        value={imei}
                        onChange={(e) => setImei(e.target.value)}
                        disabled={loading}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amount">Monto del Préstamo ($)</Label>
                    <Input 
                      id="amount" 
                      type="number" 
                      placeholder="0.00" 
                      className="rounded-xl h-12 text-lg font-semibold"
                      value={initialAmount}
                      onChange={(e) => setInitialAmount(e.target.value)}
                      disabled={loading}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>Plan de Pagos Quincenales</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => setPlanType('6')}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${planType === '6' ? 'border-primary bg-primary/5' : 'border-slate-100 hover:border-slate-200'}`}
                    >
                      <p className="font-bold text-lg text-primary">6 Cuotas</p>
                      <p className="text-xs text-muted-foreground">Recargo del 50% sobre el monto base</p>
                    </button>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => setPlanType('12')}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${planType === '12' ? 'border-primary bg-primary/5' : 'border-slate-100 hover:border-slate-200'}`}
                    >
                      <p className="font-bold text-lg text-primary">12 Cuotas</p>
                      <p className="text-xs text-muted-foreground">Recargo del 100% sobre el monto base</p>
                    </button>
                  </div>
                </div>

                <Button type="submit" disabled={loading} className="w-full h-14 rounded-xl text-lg font-bold shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 text-white transition-all transform hover:scale-[1.01]">
                  {loading ? "Creando Crédito..." : "Generar Crédito y Plan de Pagos"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border-none shadow-lg bg-primary text-white overflow-hidden relative">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Smartphone className="w-32 h-32" />
              </div>
              <CardHeader>
                <CardTitle>Resumen Financiero</CardTitle>
                <CardDescription className="text-white/70">Cálculo del plan seleccionado</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 relative z-10">
                <div className="flex justify-between items-center border-b border-white/20 pb-4">
                  <span className="text-sm opacity-80">Monto Base</span>
                  <span className="text-xl font-bold">${parseFloat(initialAmount) || 0}</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/20 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm opacity-80">Recargo Aplicado</span>
                    <Badge variant="outline" className="border-white/30 text-accent font-bold">+{calculation.interestRate}%</Badge>
                  </div>
                  <span className="text-xl font-bold text-accent">+${(calculation.totalAmount - (parseFloat(initialAmount) || 0)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-xs uppercase tracking-wider opacity-60 font-bold mb-1">Total a Pagar</p>
                    <h2 className="text-4xl font-extrabold">${calculation.totalAmount.toFixed(2)}</h2>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-wider opacity-60 font-bold mb-1">Cuota Quincenal</p>
                    <h3 className="text-2xl font-bold">${calculation.installmentAmount.toFixed(2)}</h3>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-white/10 pt-4 flex gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span className="text-xs font-medium">{planType} Pagos Quincenales</span>
                </div>
              </CardFooter>
            </Card>

            <Card className="border-none shadow-sm bg-slate-50 border border-slate-100">
               <CardHeader className="pb-2">
                 <CardTitle className="text-sm font-semibold flex items-center gap-2">
                   <Info className="w-4 h-4 text-primary" />
                   Recordatorios de Pago
                 </CardTitle>
               </CardHeader>
               <CardContent className="text-xs text-muted-foreground space-y-2">
                 <p>• El cliente recibirá un mensaje de WhatsApp 2 días antes de cada vencimiento.</p>
                 <p>• Los pagos deben realizarse en sucursal o vía transferencia bancaria.</p>
                 <p>• <strong>Bloqueo PayJoy:</strong> Si el pago se atrasa más de 48 horas, el equipo se bloqueará automáticamente.</p>
               </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
