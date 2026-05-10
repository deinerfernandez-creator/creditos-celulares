
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Smartphone, 
  ChevronLeft, 
  Calculator,
  MessageCircle,
  Home,
  CheckCircle2,
  Tag
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value);
};

export default function QuotationPage() {
  const { toast } = useToast();

  const [deviceModel, setDeviceModel] = useState('');
  const [initialAmount, setInitialAmount] = useState('');
  const [downPayment, setDownPayment] = useState('');
  const [planType, setPlanType] = useState<'6' | '12' | '24'>('6');
  const [paymentFrequency, setPaymentFrequency] = useState<'semanal' | 'quincenal'>('quincenal');
  
  const [calculation, setCalculation] = useState({
    financedAmount: 0,
    totalAmount: 0,
    installmentAmount: 0
  });

  useEffect(() => {
    const total_price = parseFloat(initialAmount) || 0;
    const down_pay = parseFloat(downPayment) || 0;
    const amountToFinance = Math.max(0, total_price - down_pay);
    
    if (amountToFinance > 0) {
      let interest = 0.5; 
      if (planType === '12') interest = 1.0;
      else if (planType === '24') interest = 1.5;

      const totalFinanced = amountToFinance * (1 + interest);
      const installments = parseInt(planType);
      const installment = totalFinanced / installments;

      setCalculation({
        financedAmount: amountToFinance,
        totalAmount: totalFinanced,
        installmentAmount: Math.round(installment)
      });
    } else {
      setCalculation({ financedAmount: 0, totalAmount: 0, installmentAmount: 0 });
    }
  }, [initialAmount, downPayment, planType]);

  const handleShareWhatsApp = () => {
    if (!deviceModel || !initialAmount || !downPayment) {
      toast({ title: "Datos incompletos", variant: "destructive" });
      return;
    }

    const message = `¡Hola! Tu cotización de *Tecnicell Créditos*:
📱 *Equipo:* ${deviceModel}
💰 *Precio:* ${formatCurrency(parseFloat(initialAmount))}
✅ *Cuota Inicial:* ${formatCurrency(parseFloat(downPayment))}
📅 *Plazo:* ${planType} meses
💵 *Valor Cuota ${paymentFrequency}:* ${formatCurrency(calculation.installmentAmount)}

*Requisitos:* Cédula y cuota inicial. ¡Entrega inmediata!`;

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 flex items-center justify-center font-body">
      <div className="w-full max-w-5xl space-y-6 animate-in fade-in duration-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild className="rounded-full bg-white shadow-sm border border-slate-100">
              <Link href="/"><ChevronLeft className="w-5 h-5" /></Link>
            </Button>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Cotizador Tecnicell</h1>
              <p className="text-[10px] uppercase font-black text-primary tracking-widest">Simula tu plan de pagos</p>
            </div>
          </div>
          <div className="p-3 bg-primary/10 rounded-2xl">
            <Calculator className="w-6 h-6 text-primary" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 border-none shadow-xl rounded-[2.5rem] overflow-hidden bg-white border border-slate-100">
            <CardHeader className="bg-slate-900 text-white p-8">
              <CardTitle className="text-lg font-black flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-accent" /> Datos del Equipo
              </CardTitle>
              <CardDescription className="text-slate-400 font-medium">Ingresa el modelo y el valor del celular que deseas.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-1 md:col-span-2 space-y-4">
                  <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Modelo del Celular</Label>
                  <Input 
                    placeholder="Ej: iPhone 15 Pro Max, Samsung S24..." 
                    className="rounded-xl h-14 text-lg font-bold bg-slate-50 border-slate-200"
                    value={deviceModel}
                    onChange={(e) => setDeviceModel(e.target.value)}
                  />
                </div>

                <div className="space-y-4">
                  <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Precio del Equipo (COP)</Label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                    <Input 
                      type="number"
                      placeholder="Ej: 3500000"
                      className="pl-10 rounded-xl h-14 text-xl font-black bg-slate-50 border-slate-200"
                      value={initialAmount}
                      onChange={(e) => setInitialAmount(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Tu Cuota Inicial</Label>
                  <Input 
                    type="number" 
                    placeholder="Ej: 1000000"
                    className="rounded-xl h-14 text-xl font-black text-green-700 bg-green-50/30 border-green-100"
                    value={downPayment}
                    onChange={(e) => setDownPayment(e.target.value)}
                  />
                </div>

                <div className="space-y-4">
                  <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Frecuencia de Pago</Label>
                  <Select value={paymentFrequency} onValueChange={(val: any) => setPaymentFrequency(val)}>
                    <SelectTrigger className="rounded-xl h-14 bg-slate-50 border-slate-200 font-bold"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="semanal" className="font-bold">Semanal</SelectItem>
                      <SelectItem value="quincenal" className="font-bold">Quincenal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Tiempo del Crédito</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {['6', '12', '24'].map(num => (
                      <button 
                        key={num} 
                        type="button"
                        onClick={() => setPlanType(num as any)} 
                        className={`h-14 rounded-xl border-2 font-black text-xs transition-all ${planType === num ? 'border-primary bg-primary text-white' : 'border-slate-100 bg-slate-50 text-slate-400'}`}
                      >
                        {num} Meses
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border-none shadow-2xl bg-primary text-white rounded-[2.5rem] overflow-hidden sticky top-8">
              <CardHeader className="bg-white/10 border-b border-white/10 pb-6">
                <CardTitle className="text-lg font-black uppercase tracking-tighter">Resumen del Plan</CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className="text-center space-y-1">
                  <p className="text-[10px] opacity-70 font-black uppercase tracking-widest">Valor de tu Cuota {paymentFrequency}</p>
                  <h2 className="text-5xl font-black tracking-tighter">{formatCurrency(calculation.installmentAmount)}</h2>
                  <Badge className="bg-accent text-white mt-4 rounded-full px-4 font-black text-[10px]">
                    PLAN A {planType} MESES
                  </Badge>
                </div>
                
                <div className="space-y-4 pt-4">
                  <div className="flex justify-between items-center text-sm border-b border-white/10 pb-3">
                    <span className="font-bold opacity-70">Precio Oficial</span>
                    <span className="font-black">{formatCurrency(parseFloat(initialAmount) || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b border-white/10 pb-3 text-accent">
                    <span className="font-bold">Pago Inicial (-)</span>
                    <span className="font-black">{formatCurrency(parseFloat(downPayment) || 0)}</span>
                  </div>
                </div>

                <div className="space-y-4 pt-4">
                  <Button 
                    onClick={handleShareWhatsApp} 
                    disabled={!deviceModel}
                    className="w-full h-16 rounded-2xl bg-green-500 font-black text-base hover:bg-green-600 shadow-xl shadow-green-500/20 gap-3"
                  >
                    <MessageCircle className="w-6 h-6" /> Compartir Cotización
                  </Button>
                  
                  <div className="p-4 bg-white/10 rounded-2xl border border-white/10 flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
                    <p className="text-[9px] leading-relaxed opacity-80 font-bold uppercase tracking-wider">
                      Entrega inmediata una vez legalizado tu crédito en tienda. ¡Sin trámites difíciles!
                    </p>
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
