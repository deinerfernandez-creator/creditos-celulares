
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Smartphone, ChevronLeft, Hash, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';

export default function NewCreditPage() {
  const router = useRouter();
  const { toast } = useToast();
  const db = useFirestore();
  
  const customersQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'customers'), orderBy('name', 'asc'));
  }, [db]);

  const { data: customers } = useCollection(customersQuery);

  const [loading, setLoading] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [deviceModel, setDeviceModel] = useState('');
  const [imei, setImei] = useState('');
  const [initialAmount, setInitialAmount] = useState('');
  const [downPayment, setDownPayment] = useState('');
  const [planType, setPlanType] = useState<'6' | '12'>('6');
  
  const [calculation, setCalculation] = useState({
    interestRate: 0,
    financedAmount: 0,
    totalAmount: 0,
    installmentAmount: 0
  });

  useEffect(() => {
    const total_price = parseFloat(initialAmount) || 0;
    const down_pay = parseFloat(downPayment) || 0;
    const amountToFinance = Math.max(0, total_price - down_pay);
    
    if (amountToFinance > 0) {
      const interest = planType === '6' ? 0.5 : 1.0;
      const totalFinanced = amountToFinance * (1 + interest);
      const installments = planType === '6' ? 6 : 12;
      const installment = totalFinanced / installments;

      setCalculation({
        interestRate: interest * 100,
        financedAmount: amountToFinance,
        totalAmount: totalFinanced,
        installmentAmount: Math.round(installment * 100) / 100
      });
    } else {
      setCalculation({ interestRate: 0, financedAmount: 0, totalAmount: 0, installmentAmount: 0 });
    }
  }, [initialAmount, downPayment, planType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !deviceModel || !imei || !initialAmount || downPayment === '') {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    const creditData = {
      customerId,
      deviceModel,
      imei,
      initialAmount: parseFloat(initialAmount),
      downPayment: parseFloat(downPayment),
      totalAmount: calculation.totalAmount,
      planType: parseInt(planType),
      installmentAmount: calculation.installmentAmount,
      remainingBalance: calculation.totalAmount,
      status: 'activo',
      createdAt: serverTimestamp(),
    };

    addDoc(collection(db, 'credits'), creditData)
      .then(() => {
        toast({
          title: "Éxito",
          description: "Crédito creado correctamente.",
        });
        router.push('/');
      })
      .catch((error: any) => {
        toast({
          title: "Error",
          description: "No se pudo crear el crédito: " + error.message,
          variant: "destructive"
        });
        setLoading(false);
      });
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
                        placeholder="15 dígitos" 
                        className="pl-10 rounded-xl h-12 font-mono text-sm"
                        value={imei}
                        onChange={(e) => setImei(e.target.value)}
                        disabled={loading}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amount">Precio Total del Equipo ($)</Label>
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

                  <div className="space-y-2">
                    <Label htmlFor="downPayment">Cuota Inicial / Abono ($)</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-600" />
                      <Input 
                        id="downPayment" 
                        type="number" 
                        placeholder="0.00" 
                        className="pl-10 rounded-xl h-12 text-lg font-semibold text-green-700 bg-green-50/30"
                        value={downPayment}
                        onChange={(e) => setDownPayment(e.target.value)}
                        disabled={loading}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>Plan de Pagos Quincenales (Sobre saldo restante)</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      type="button"
                      disabled={loading || calculation.financedAmount <= 0}
                      onClick={() => setPlanType('6')}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${planType === '6' ? 'border-primary bg-primary/5' : 'border-slate-100 hover:border-slate-200'} ${calculation.financedAmount <= 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <p className="font-bold text-lg text-primary">6 Cuotas</p>
                      <p className="text-xs text-muted-foreground">Recargo del 50%</p>
                    </button>
                    <button
                      type="button"
                      disabled={loading || calculation.financedAmount <= 0}
                      onClick={() => setPlanType('12')}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${planType === '12' ? 'border-primary bg-primary/5' : 'border-slate-100 hover:border-slate-200'} ${calculation.financedAmount <= 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <p className="font-bold text-lg text-primary">12 Cuotas</p>
                      <p className="text-xs text-muted-foreground">Recargo del 100%</p>
                    </button>
                  </div>
                </div>

                <Button type="submit" disabled={loading || calculation.financedAmount <= 0} className="w-full h-14 rounded-xl text-lg font-bold shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 text-white">
                  {loading ? "Generando..." : "Crear Crédito"}
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
              </CardHeader>
              <CardContent className="space-y-6 relative z-10">
                <div className="flex justify-between items-center border-b border-white/20 pb-4">
                  <span className="text-sm opacity-80">Precio Equipo</span>
                  <span className="text-xl font-bold">${parseFloat(initialAmount) || 0}</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/20 pb-4">
                  <span className="text-sm opacity-80 text-accent font-bold">Cuota Inicial (-)</span>
                  <span className="text-xl font-bold text-accent">-${parseFloat(downPayment) || 0}</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/20 pb-4">
                  <span className="text-sm opacity-80">Monto a Financiar</span>
                  <span className="text-xl font-bold">${calculation.financedAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/20 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm opacity-80">Recargo (+{calculation.interestRate}%)</span>
                  </div>
                  <span className="text-xl font-bold text-accent">+${(calculation.totalAmount - calculation.financedAmount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-xs opacity-60 font-bold mb-1">Total a Pagar en Cuotas</p>
                    <h2 className="text-4xl font-extrabold">${calculation.totalAmount.toFixed(2)}</h2>
                  </div>
                  <div className="text-right">
                    <p className="text-xs opacity-60 font-bold mb-1">Cuota Quincenal</p>
                    <h3 className="text-2xl font-bold">${calculation.installmentAmount.toFixed(2)}</h3>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
