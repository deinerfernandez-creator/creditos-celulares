"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Smartphone, ChevronLeft, Calendar, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { MOCK_CUSTOMERS } from '@/lib/mock-data';
import Link from 'next/link';

export default function NewCreditPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [customerId, setCustomerId] = useState('');
  const [deviceModel, setDeviceModel] = useState('');
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !deviceModel || !initialAmount) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos.",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Éxito",
      description: "Crédito registrado correctamente. Generando plan de pagos...",
    });
    
    // In a real app we'd save and redirect
    setTimeout(() => router.push('/'), 2000);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 flex items-center justify-center">
      <div className="w-full max-w-4xl space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="rounded-full">
            <Link href="/"><ChevronLeft className="w-5 h-5" /></Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Nueva Solicitud de Crédito</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="border-none shadow-xl shadow-primary/5">
            <CardHeader className="border-b bg-slate-50/50">
              <CardTitle className="text-lg">Información del Equipo</CardTitle>
              <CardDescription>Detalles del financiamiento</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="customer">Cliente</Label>
                  <Select onValueChange={setCustomerId} required>
                    <SelectTrigger className="rounded-xl h-12">
                      <SelectValue placeholder="Selecciona un cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {MOCK_CUSTOMERS.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
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
                      placeholder="Ej: iPhone 15 Pro, Samsung S24" 
                      className="pl-10 rounded-xl h-12"
                      value={deviceModel}
                      onChange={(e) => setDeviceModel(e.target.value)}
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
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Plan de Pagos</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setPlanType('6')}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${planType === '6' ? 'border-primary bg-primary/5' : 'border-slate-100 hover:border-slate-200'}`}
                    >
                      <p className="font-bold text-lg">6 Cuotas</p>
                      <p className="text-sm text-muted-foreground">Quincenales (50% recargo)</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlanType('12')}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${planType === '12' ? 'border-primary bg-primary/5' : 'border-slate-100 hover:border-slate-200'}`}
                    >
                      <p className="font-bold text-lg">12 Cuotas</p>
                      <p className="text-sm text-muted-foreground">Quincenales (100% recargo)</p>
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full h-12 rounded-xl text-lg font-bold shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 text-white">
                  Generar Crédito
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
                <CardTitle>Resumen de Pago</CardTitle>
                <CardDescription className="text-white/70">Cálculo automático del plan</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 relative z-10">
                <div className="flex justify-between items-center border-b border-white/20 pb-4">
                  <span className="text-sm opacity-80">Monto Original</span>
                  <span className="text-xl font-bold">${parseFloat(initialAmount) || 0}</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/20 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm opacity-80">Intereses / Recargos</span>
                    <Info className="w-3 h-3 opacity-50" />
                  </div>
                  <span className="text-xl font-bold text-accent">+{calculation.interestRate}%</span>
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-xs uppercase tracking-wider opacity-60 font-bold mb-1">Monto Total a Pagar</p>
                    <h2 className="text-4xl font-extrabold">${calculation.totalAmount}</h2>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-wider opacity-60 font-bold mb-1">Por Cuota</p>
                    <h3 className="text-2xl font-bold">${calculation.installmentAmount}</h3>
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
                   Información del Plan
                 </CardTitle>
               </CardHeader>
               <CardContent className="text-sm text-muted-foreground space-y-2">
                 <p>• Los pagos deben realizarse cada 15 días.</p>
                 <p>• El sistema enviará recordatorios automáticos 3 días antes del vencimiento.</p>
                 <p>• El retraso en más de 2 cuotas activará el estado de "Atrasado".</p>
               </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}