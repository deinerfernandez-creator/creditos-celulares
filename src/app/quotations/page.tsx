
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
  DollarSign, 
  Search,
  Calculator,
  CalendarClock,
  ArrowRight,
  TrendingUp,
  ReceiptText
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

const PHONE_DATABASE = {
  "Apple": ["iPhone 15 Pro Max", "iPhone 15 Pro", "iPhone 15 Plus", "iPhone 15", "iPhone 14 Pro Max", "iPhone 14 Pro", "iPhone 13", "iPhone 11"],
  "Samsung": ["Galaxy S24 Ultra", "Galaxy S24+", "Galaxy S23 Ultra", "Galaxy A55", "Galaxy A35", "Galaxy A15", "Galaxy Z Fold 5"],
  "Xiaomi": ["Redmi Note 13 Pro+", "Redmi Note 13", "Redmi 13C", "POCO X6 Pro", "POCO M6 Pro"],
  "Motorola": ["Edge 50 Pro", "Moto G84 5G", "Moto G54 5G", "Moto G24", "Razr 40 Ultra"],
  "Infinix": ["Note 40 Pro", "Note 30 Pro", "Hot 40 Pro", "Smart 8 Pro"],
  "Tecno": ["Camon 30 Premier", "Spark 20 Pro+", "Spark 20", "Pova 6 Pro"],
  "Realme": ["Realme 12 Pro+", "Realme 11 Pro+", "Realme C67", "Realme C53"],
};

const BRANDS = Object.keys(PHONE_DATABASE).sort();

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value);
};

export default function QuotationPage() {
  const { toast } = useToast();
  const [selectedBrand, setSelectedBrand] = useState<string | 'all'>('all');
  const [deviceModel, setDeviceModel] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [initialAmount, setInitialAmount] = useState('');
  const [downPayment, setDownPayment] = useState('');
  const [planType, setPlanType] = useState<'6' | '12' | '24'>('6');
  const [paymentFrequency, setPaymentFrequency] = useState<'semanal' | 'quincenal'>('quincenal');
  
  const [calculation, setCalculation] = useState({
    financedAmount: 0,
    totalAmount: 0,
    installmentAmount: 0
  });

  const getFilteredModels = () => {
    let baseList: string[] = [];
    if (selectedBrand === 'all') {
      baseList = Object.values(PHONE_DATABASE).flat();
    } else {
      baseList = PHONE_DATABASE[selectedBrand as keyof typeof PHONE_DATABASE] || [];
    }
    return Array.from(new Set(baseList))
      .filter(m => m.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort();
  };

  const filteredModels = getFilteredModels();

  useEffect(() => {
    const total_price = parseFloat(initialAmount) || 0;
    const down_pay = parseFloat(downPayment) || 0;
    const amountToFinance = Math.max(0, total_price - down_pay);
    
    if (amountToFinance > 0) {
      let interest = 0.5; // 6 cuotas
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

  const handleSetDownPaymentPercentage = (percentage: number) => {
    const total = parseFloat(initialAmount) || 0;
    if (total > 0) {
      const calculated = Math.round(total * (percentage / 100));
      setDownPayment(calculated.toString());
      toast({
        title: `Inicial del ${percentage}%`,
        description: `Calculado: ${formatCurrency(calculated)}`,
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 flex items-center justify-center font-body">
      <div className="w-full max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild className="rounded-full bg-white shadow-sm">
              <Link href="/"><ChevronLeft className="w-5 h-5" /></Link>
            </Button>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Cotizador de Equipos</h1>
              <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Calcula el plan ideal para el cliente</p>
            </div>
          </div>
          <Calculator className="w-8 h-8 text-primary opacity-20" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 border-none shadow-xl rounded-[2.5rem] overflow-hidden bg-white">
            <CardHeader className="bg-slate-900 text-white p-8">
              <CardTitle className="text-lg font-black flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-accent" /> Datos de la Cotización
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="font-bold text-slate-700">Seleccionar Equipo</Label>
                  <div className="flex gap-2">
                    <div className="w-1/3">
                      <Select onValueChange={setSelectedBrand} value={selectedBrand}>
                        <SelectTrigger className="rounded-xl h-12 bg-slate-50 border-slate-200">
                          <SelectValue placeholder="Marca" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas</SelectItem>
                          {BRANDS.map(brand => (
                            <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input 
                        placeholder="Buscar modelo..." 
                        className="pl-10 rounded-xl h-12 bg-slate-50 border-slate-200"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                  <Select onValueChange={setDeviceModel} value={deviceModel}>
                    <SelectTrigger className="rounded-xl h-12 bg-slate-50 border-slate-200 font-bold">
                      <SelectValue placeholder="Modelo exacto" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredModels.map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label className="font-bold text-slate-700">Precio de Venta (COP)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                      type="number" 
                      placeholder="Ejem: 2500000" 
                      className="pl-10 rounded-xl h-12 text-lg font-black bg-slate-50 border-slate-200"
                      value={initialAmount}
                      onChange={(e) => setInitialAmount(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-3 col-span-1 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <Label className="font-bold text-slate-700">Cuota Inicial Sugerida</Label>
                    <div className="flex gap-2">
                      {[30, 40, 50].map(pct => (
                        <Button 
                          key={pct}
                          type="button" 
                          variant="outline" 
                          size="sm" 
                          className="h-7 text-[10px] font-black rounded-full border-primary/20 hover:bg-primary/5 px-4"
                          onClick={() => handleSetDownPaymentPercentage(pct)}
                        >
                          {pct}%
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-600" />
                    <Input 
                      type="number" 
                      placeholder="Monto entregado por el cliente" 
                      className="pl-10 rounded-xl h-12 text-lg font-black text-green-700 bg-green-50/30 border-green-100"
                      value={downPayment}
                      onChange={(e) => setDownPayment(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="font-bold text-slate-700 flex items-center gap-2">
                    <CalendarClock className="w-4 h-4 text-primary" /> Frecuencia de Cobro
                  </Label>
                  <Select value={paymentFrequency} onValueChange={(val: any) => setPaymentFrequency(val)}>
                    <SelectTrigger className="rounded-xl h-12 bg-slate-50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="semanal">Semanal</SelectItem>
                      <SelectItem value="quincenal">Quincenal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label className="font-bold text-slate-700">Plan de Cuotas</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {['6', '12', '24'].map(num => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setPlanType(num as any)}
                        className={`p-3 rounded-xl border-2 transition-all text-center ${planType === num ? 'border-primary bg-primary/5' : 'border-slate-100 hover:border-slate-200'}`}
                      >
                        <p className="font-black text-sm text-primary">{num} Meses</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-primary/5 p-6 rounded-[2rem] border border-primary/10 flex items-center gap-6">
                <div className="p-4 bg-primary text-white rounded-2xl">
                  <ReceiptText className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900 leading-tight">Proyección de Venta</p>
                  <p className="text-xs text-slate-500 font-medium">Esta cotización es válida por 48 horas según disponibilidad de inventario.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border-none shadow-2xl bg-primary text-white overflow-hidden relative rounded-[2.5rem]">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <TrendingUp className="w-32 h-32" />
              </div>
              <CardHeader>
                <CardTitle className="font-black tracking-tight text-xl">Resultado del Plan</CardTitle>
                <CardDescription className="text-white/60 font-medium">Resumen para el cliente</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 relative z-10 pt-4">
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-white/10 pb-4">
                    <span className="text-xs font-bold opacity-70 uppercase tracking-widest">Precio Equipo</span>
                    <span className="text-lg font-black">{formatCurrency(parseFloat(initialAmount) || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-white/10 pb-4">
                    <span className="text-xs font-bold text-accent uppercase tracking-widest">Cuota Inicial (-)</span>
                    <span className="text-lg font-black text-accent">-{formatCurrency(parseFloat(downPayment) || 0)}</span>
                  </div>
                </div>

                <div className="pt-6 text-center">
                  <p className="text-[10px] opacity-60 font-black uppercase tracking-widest mb-2">Cuotas {paymentFrequency === 'semanal' ? 'Semanales' : 'Quincenales'}</p>
                  <h2 className="text-5xl font-black tracking-tighter text-white">{formatCurrency(calculation.installmentAmount)}</h2>
                  <p className="text-xs font-bold text-accent mt-2">Por {planType} meses</p>
                </div>
                
                <div className="pt-8">
                  <Button className="w-full h-14 rounded-2xl bg-white text-primary font-black hover:bg-slate-100 shadow-xl shadow-black/20" asChild>
                    <Link href="/credits/new">
                      Crear Crédito Ahora <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="p-6 bg-slate-900 rounded-[2rem] text-white space-y-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Requisitos para el Cliente</h4>
              <ul className="space-y-3">
                <li className="flex gap-3 text-xs font-medium">
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">1</div>
                  Cédula de ciudadanía original.
                </li>
                <li className="flex gap-3 text-xs font-medium">
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">2</div>
                  Cuota inicial mínima del 30%.
                </li>
                <li className="flex gap-3 text-xs font-medium">
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">3</div>
                  Firma y huella en contrato legal.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
