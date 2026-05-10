"use client";

import React, { useState, useEffect, useMemo } from 'react';
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
  ReceiptText,
  MessageCircle,
  Package
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value);
};

export default function QuotationPage() {
  const { toast } = useToast();
  const db = useFirestore();

  const phonesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'phones'), orderBy('brand', 'asc'));
  }, [db]);
  const { data: inventoryPhones } = useCollection(phonesQuery);

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

  const availableBrands = useMemo(() => {
    if (!inventoryPhones) return [];
    const brands = new Set(inventoryPhones.map(p => p.brand));
    return Array.from(brands).sort();
  }, [inventoryPhones]);

  const filteredModels = useMemo(() => {
    if (!inventoryPhones) return [];
    let list = inventoryPhones;
    if (selectedBrand !== 'all') {
      list = list.filter(p => p.brand === selectedBrand);
    }
    return list
      .filter(p => p.model.toLowerCase().includes(searchTerm.toLowerCase()))
      .map(p => `${p.brand} ${p.model}`)
      .sort();
  }, [inventoryPhones, selectedBrand, searchTerm]);

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

  const handleSetDownPaymentPercentage = (percentage: number) => {
    const total = parseFloat(initialAmount) || 0;
    if (total > 0) {
      const calculated = Math.round(total * (percentage / 100));
      setDownPayment(calculated.toString());
    }
  };

  const handleShareWhatsApp = () => {
    if (!deviceModel || !initialAmount || !downPayment) {
      toast({ title: "Datos incompletos", variant: "destructive" });
      return;
    }

    const message = `¡Hola! Tu cotización de *Tecnicell Créditos*:
📱 *Equipo:* ${deviceModel}
💰 *Precio:* ${formatCurrency(parseFloat(initialAmount))}
✅ *Cuota Inicial:* ${formatCurrency(parseFloat(downPayment))}
📅 *Plan:* ${planType} meses
💵 *Cuota ${paymentFrequency}:* ${formatCurrency(calculation.installmentAmount)}`;

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
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
              <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Calcula el plan ideal</p>
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
                  <Label className="font-bold">Seleccionar Equipo del Inventario</Label>
                  <div className="flex gap-2">
                    <div className="w-1/3">
                      <Select onValueChange={setSelectedBrand} value={selectedBrand}>
                        <SelectTrigger className="rounded-xl h-12 bg-slate-50 border-slate-200">
                          <SelectValue placeholder="Marca" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas</SelectItem>
                          {availableBrands.map(brand => (
                            <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input 
                        placeholder="Buscar..." 
                        className="pl-10 rounded-xl h-12 bg-slate-50 border-slate-200"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                  <Select onValueChange={setDeviceModel} value={deviceModel}>
                    <SelectTrigger className="rounded-xl h-12 bg-slate-50 border-slate-200 font-bold">
                      <SelectValue placeholder="Modelo" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredModels.map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                      {searchTerm && !filteredModels.includes(searchTerm) && (
                        <SelectItem value={searchTerm}>Usar: "{searchTerm}"</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <Link href="/inventory" className="text-[10px] font-black text-primary uppercase text-right hover:underline flex items-center justify-end gap-1">
                    <Package className="w-3 h-3" /> Ver catálogo completo
                  </Link>
                </div>

                <div className="space-y-3">
                  <Label className="font-bold">Precio Venta (COP)</Label>
                  <Input 
                    type="number" 
                    placeholder="Ejem: 2500000" 
                    className="rounded-xl h-12 text-lg font-black bg-slate-50"
                    value={initialAmount}
                    onChange={(e) => setInitialAmount(e.target.value)}
                  />
                </div>

                <div className="space-y-3 col-span-1 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <Label className="font-bold">Cuota Inicial Sugerida</Label>
                    <div className="flex gap-2">
                      {[30, 40, 50].map(pct => (
                        <Button key={pct} variant="outline" size="sm" className="h-7 text-[10px] font-black rounded-full" onClick={() => handleSetDownPaymentPercentage(pct)}>
                          {pct}%
                        </Button>
                      ))}
                    </div>
                  </div>
                  <Input 
                    type="number" 
                    className="rounded-xl h-12 text-lg font-black text-green-700 bg-green-50/30"
                    value={downPayment}
                    onChange={(e) => setDownPayment(e.target.value)}
                  />
                </div>

                <div className="space-y-3">
                  <Label className="font-bold">Frecuencia</Label>
                  <Select value={paymentFrequency} onValueChange={(val: any) => setPaymentFrequency(val)}>
                    <SelectTrigger className="rounded-xl h-12 bg-slate-50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="semanal">Semanal</SelectItem>
                      <SelectItem value="quincenal">Quincenal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label className="font-bold">Plan</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {['6', '12', '24'].map(num => (
                      <button key={num} onClick={() => setPlanType(num as any)} className={`p-3 rounded-xl border-2 font-black text-xs ${planType === num ? 'border-primary bg-primary/5' : 'border-slate-100'}`}>
                        {num} Meses
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-2xl bg-primary text-white rounded-[2.5rem]">
            <CardHeader><CardTitle className="font-black">Resultado</CardTitle></CardHeader>
            <CardContent className="space-y-8 pt-4">
              <div className="text-center">
                <p className="text-[10px] opacity-60 font-black uppercase mb-2">Cuota {paymentFrequency}</p>
                <h2 className="text-5xl font-black">{formatCurrency(calculation.installmentAmount)}</h2>
                <p className="text-xs font-bold text-accent mt-2">Por {planType} meses</p>
              </div>
              <Button onClick={handleShareWhatsApp} className="w-full h-14 rounded-2xl bg-green-500 font-black hover:bg-green-600">
                <MessageCircle className="w-5 h-5 mr-2" /> Compartir WhatsApp
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
