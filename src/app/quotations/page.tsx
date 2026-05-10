
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
  Search,
  Calculator,
  MessageCircle,
  Package,
  AlertCircle,
  Home,
  CheckCircle2,
  Tag
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
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
  const db = useFirestore();

  const phonesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'phones'), orderBy('brand', 'asc'));
  }, [db]);
  const { data: allPhones, isLoading } = useCollection(phonesQuery);

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

  // Solo mostramos marcas que tengan equipos con stock
  const availableBrands = useMemo(() => {
    if (!allPhones) return [];
    const brandsInStock = allPhones
      .filter(p => p.imeis && p.imeis.length > 0)
      .map(p => p.brand)
      .filter(Boolean);
    return Array.from(new Set(brandsInStock)).sort();
  }, [allPhones]);

  // Solo mostramos modelos que tengan existencias reales (IMEIs disponibles)
  const modelsInStock = useMemo(() => {
    if (!allPhones) return [];
    let list = allPhones.filter(p => p.imeis && p.imeis.length > 0);
    
    if (selectedBrand !== 'all') {
      list = list.filter(p => p.brand === selectedBrand);
    }
    
    return list
      .filter(p => p.model.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => a.model.localeCompare(b.model));
  }, [allPhones, selectedBrand, searchTerm]);

  const handleModelSelect = (val: string) => {
    setDeviceModel(val);
    const phone = allPhones?.find(p => `${p.brand} ${p.model}` === val);
    if (phone?.salePrice) {
      setInitialAmount(phone.salePrice.toString());
      // Sugerimos el 30% de inicial automáticamente al seleccionar
      const initialDown = Math.round(phone.salePrice * 0.3);
      setDownPayment(initialDown.toString());
    }
  };

  const selectedPhoneInfo = useMemo(() => {
    if (!deviceModel || !allPhones) return null;
    return allPhones.find(p => `${p.brand} ${p.model}` === deviceModel);
  }, [deviceModel, allPhones]);

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
💰 *Precio Oficial:* ${formatCurrency(parseFloat(initialAmount))}
✅ *Cuota Inicial:* ${formatCurrency(parseFloat(downPayment))}
📅 *Plazo:* ${planType} meses
💵 *Valor Cuota ${paymentFrequency}:* ${formatCurrency(calculation.installmentAmount)}

*Requisitos:* Cédula original y cuota inicial. ¡Entrega inmediata!`;

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
              <p className="text-[10px] uppercase font-black text-primary tracking-widest">Catálogo de Equipos en Stock</p>
            </div>
          </div>
          <div className="p-3 bg-primary/10 rounded-2xl">
            <Calculator className="w-6 h-6 text-primary" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 border-none shadow-xl rounded-[2.5rem] overflow-hidden bg-white border border-slate-100">
            <CardHeader className="bg-slate-900 text-white p-8">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg font-black flex items-center gap-2">
                  <Package className="w-5 h-5 text-accent" /> Selección de Equipo
                </CardTitle>
                {deviceModel && (
                  <Badge className="bg-green-500 text-white border-none rounded-full px-4 py-1 font-black text-[10px] tracking-widest">
                    DISPONIBLE: {selectedPhoneInfo?.imeis?.length || 0}
                  </Badge>
                )}
              </div>
              <CardDescription className="text-slate-400 font-medium">Elige uno de nuestros equipos disponibles para ver su precio y plan de pagos.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Filtrar por Marca</Label>
                  <div className="flex gap-2">
                    <div className="w-full">
                      <Select onValueChange={setSelectedBrand} value={selectedBrand}>
                        <SelectTrigger className="rounded-xl h-12 bg-slate-50 border-slate-200 font-bold">
                          <SelectValue placeholder="Todas las marcas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas las marcas</SelectItem>
                          {availableBrands.map(brand => (
                            <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Buscar Modelo</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                      placeholder="iPhone, Samsung, Xiaomi..." 
                      className="pl-10 rounded-xl h-12 bg-slate-50 border-slate-200 font-medium"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                <div className="col-span-1 md:col-span-2 space-y-4">
                  <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Equipos en Vitrina</Label>
                  <Select onValueChange={handleModelSelect} value={deviceModel}>
                    <SelectTrigger className="rounded-2xl h-16 bg-primary/5 border-primary/20 font-black text-lg text-primary">
                      <SelectValue placeholder="Toca aquí para elegir tu equipo..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {isLoading ? (
                        <div className="p-4 text-center text-xs text-slate-400">Cargando existencias...</div>
                      ) : modelsInStock.length > 0 ? (
                        modelsInStock.map((p) => (
                          <SelectItem key={p.id} value={`${p.brand} ${p.model}`} className="py-3 font-bold">
                            <div className="flex flex-col">
                              <span>{p.brand} {p.model}</span>
                              <span className="text-[10px] text-green-600">{formatCurrency(p.salePrice)}</span>
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-4 text-center text-xs text-slate-400 font-bold uppercase italic">No hay equipos con stock para este filtro.</div>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {deviceModel && (
                  <>
                    <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                      <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Precio de Venta</Label>
                      <div className="relative">
                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                        <Input 
                          type="text" 
                          readOnly
                          className="pl-10 rounded-xl h-14 text-xl font-black bg-slate-100 border-slate-200 text-slate-900"
                          value={formatCurrency(parseFloat(initialAmount))}
                        />
                      </div>
                    </div>

                    <div className="space-y-4 col-span-1 md:col-span-1 animate-in slide-in-from-top-2 duration-300">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Tu Cuota Inicial</Label>
                        <div className="flex gap-1">
                          {[30, 40, 50].map(pct => (
                            <button 
                              key={pct} 
                              onClick={() => handleSetDownPaymentPercentage(pct)}
                              className="text-[9px] font-black bg-slate-100 hover:bg-primary hover:text-white px-2 py-1 rounded-md transition-colors"
                            >
                              {pct}%
                            </button>
                          ))}
                        </div>
                      </div>
                      <Input 
                        type="number" 
                        placeholder="Monto a pagar hoy"
                        className="rounded-xl h-14 text-xl font-black text-green-700 bg-green-50/30 border-green-100"
                        value={downPayment}
                        onChange={(e) => setDownPayment(e.target.value)}
                      />
                    </div>

                    <div className="space-y-4 animate-in slide-in-from-top-2 duration-400">
                      <Label className="text-xs font-black uppercase tracking-widest text-slate-400">¿Cada cuánto pagarás?</Label>
                      <Select value={paymentFrequency} onValueChange={(val: any) => setPaymentFrequency(val)}>
                        <SelectTrigger className="rounded-xl h-14 bg-slate-50 border-slate-200 font-bold"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="semanal" className="font-bold">Pago Semanal</SelectItem>
                          <SelectItem value="quincenal" className="font-bold">Pago Quincenal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-4 animate-in slide-in-from-top-2 duration-400">
                      <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Tiempo del Crédito</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {['6', '12', '24'].map(num => (
                          <button 
                            key={num} 
                            onClick={() => setPlanType(num as any)} 
                            className={`h-14 rounded-xl border-2 font-black text-xs transition-all ${planType === num ? 'border-primary bg-primary text-white' : 'border-slate-100 bg-slate-50 text-slate-400'}`}
                          >
                            {num} Meses
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
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
                    <span className="font-bold opacity-70">Precio del Celular</span>
                    <span className="font-black">{formatCurrency(parseFloat(initialAmount) || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b border-white/10 pb-3 text-accent">
                    <span className="font-bold">Pago Inicial Hoy (-)</span>
                    <span className="font-black">{formatCurrency(parseFloat(downPayment) || 0)}</span>
                  </div>
                </div>

                <div className="space-y-4 pt-4">
                  <Button 
                    onClick={handleShareWhatsApp} 
                    disabled={!deviceModel}
                    className="w-full h-16 rounded-2xl bg-green-500 font-black text-base hover:bg-green-600 shadow-xl shadow-green-500/20 gap-3"
                  >
                    <MessageCircle className="w-6 h-6" /> Enviar a WhatsApp
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
