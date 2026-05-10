
"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Smartphone, 
  ChevronLeft, 
  Hash, 
  DollarSign, 
  Camera, 
  RefreshCw, 
  Check, 
  Search,
  User as UserIcon,
  X,
  CreditCard as IdCardIcon,
  Percent,
  CalendarClock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value);
};

type PhotoType = 'customer' | 'idFront' | 'idBack';

export default function NewCreditPage() {
  const router = useRouter();
  const { toast } = useToast();
  const db = useFirestore();
  
  const customersQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'customers'), orderBy('name', 'asc'));
  }, [db]);
  const { data: customers } = useCollection(customersQuery);

  const phonesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'phones'), orderBy('brand', 'asc'));
  }, [db]);
  const { data: inventoryPhones } = useCollection(phonesQuery);

  const [loading, setLoading] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string | 'all'>('all');
  const [deviceModel, setDeviceModel] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [imei, setImei] = useState('');
  const [initialAmount, setInitialAmount] = useState('');
  const [downPayment, setDownPayment] = useState('');
  const [planType, setPlanType] = useState<'6' | '12' | '24'>('6');
  const [paymentFrequency, setPaymentFrequency] = useState<'semanal' | 'quincenal'>('quincenal');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [currentPhotoType, setCurrentPhotoType] = useState<PhotoType | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [idFrontPhoto, setIdFrontPhoto] = useState<string | null>(null);
  const [idBackPhoto, setIdBackPhoto] = useState<string | null>(null);

  const [calculation, setCalculation] = useState({
    interestRate: 0,
    financedAmount: 0,
    totalAmount: 0,
    installmentAmount: 0
  });

  const availableBrands = useMemo(() => {
    if (!inventoryPhones) return [];
    const brands = new Set(inventoryPhones.map(p => p.brand));
    return Array.from(brands).sort();
  }, [inventoryPhones]);

  const filteredModelsData = useMemo(() => {
    if (!inventoryPhones) return [];
    let list = inventoryPhones;
    if (selectedBrand !== 'all') {
      list = list.filter(p => p.brand === selectedBrand);
    }
    return list.filter(p => p.model.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [inventoryPhones, selectedBrand, searchTerm]);

  const handleModelSelect = (modelName: string) => {
    setDeviceModel(modelName);
    // Buscar si el modelo seleccionado tiene un IMEI en el inventario
    const foundPhone = inventoryPhones?.find(p => `${p.brand} ${p.model}` === modelName);
    if (foundPhone && foundPhone.imei) {
      setImei(foundPhone.imei);
    }
  };

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
        interestRate: interest * 100,
        financedAmount: amountToFinance,
        totalAmount: totalFinanced,
        installmentAmount: Math.round(installment)
      });
    } else {
      setCalculation({ interestRate: 0, financedAmount: 0, totalAmount: 0, installmentAmount: 0 });
    }
  }, [initialAmount, downPayment, planType]);

  const startCamera = async (type: PhotoType) => {
    setCurrentPhotoType(type);
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      setShowCamera(false);
      toast({
        variant: 'destructive',
        title: 'Error de Cámara',
        description: 'No se pudo acceder a la cámara.',
      });
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current && currentPhotoType) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context && video.videoWidth > 0) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const photoData = canvas.toDataURL('image/jpeg', 0.8);
        
        if (currentPhotoType === 'customer') setCapturedPhoto(photoData);
        if (currentPhotoType === 'idFront') setIdFrontPhoto(photoData);
        if (currentPhotoType === 'idBack') setIdBackPhoto(photoData);

        stopCamera();
        setShowCamera(false);
        toast({ title: "Foto Capturada" });
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const handleSetDownPaymentPercentage = (percentage: number) => {
    const total = parseFloat(initialAmount) || 0;
    if (total > 0) {
      const calculated = Math.round(total * (percentage / 100));
      setDownPayment(calculated.toString());
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !deviceModel || !imei || !initialAmount || downPayment === '' || !paymentFrequency) {
      toast({ title: "Error", description: "Completa todos los campos.", variant: "destructive" });
      return;
    }

    if (!capturedPhoto || !idFrontPhoto || !idBackPhoto) {
      toast({ title: "Fotos Requeridas", description: "Faltan documentos fotográficos.", variant: "destructive" });
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
      paymentFrequency,
      installmentAmount: calculation.installmentAmount,
      remainingBalance: calculation.totalAmount,
      status: 'activo',
      customerPhoto: capturedPhoto,
      idFrontPhoto,
      idBackPhoto,
      createdAt: serverTimestamp(),
    };

    addDoc(collection(db, 'credits'), creditData)
      .then(() => {
        toast({ title: "Éxito", description: "Crédito registrado." });
        router.push('/');
      })
      .catch((error: any) => {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        setLoading(false);
      });
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 flex items-center justify-center">
      <canvas ref={canvasRef} className="hidden" />

      <div className="w-full max-w-5xl space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="rounded-full">
            <Link href="/"><ChevronLeft className="w-5 h-5" /></Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Nueva Solicitud de Crédito</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 border-none shadow-xl">
            <CardHeader className="border-b bg-slate-50/50">
              <CardTitle className="text-lg font-black">Información del Crédito</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="font-bold">Cliente</Label>
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
                    <Label className="font-bold">Marca y Modelo</Label>
                    <div className="grid grid-cols-1 gap-2">
                      <div className="flex gap-2">
                        <div className="w-1/3">
                          <Select onValueChange={setSelectedBrand} value={selectedBrand} disabled={loading}>
                            <SelectTrigger className="rounded-xl h-12">
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
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input 
                            placeholder="Buscar modelo..." 
                            className="pl-10 rounded-xl h-12"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            disabled={loading}
                          />
                        </div>
                      </div>
                      
                      <Select onValueChange={handleModelSelect} value={deviceModel} disabled={loading} required>
                        <SelectTrigger className="rounded-xl h-12">
                          <SelectValue placeholder="Selecciona el modelo..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {filteredModelsData.map((p) => (
                            <SelectItem key={p.id} value={`${p.brand} ${p.model}`}>{p.brand} {p.model} {p.imei ? `(IMEI: ${p.imei})` : ''}</SelectItem>
                          ))}
                          {searchTerm && !filteredModelsData.some(p => `${p.brand} ${p.model}` === searchTerm) && (
                             <SelectItem value={searchTerm}>Usar: "{searchTerm}"</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <Link href="/inventory" className="text-[10px] font-black text-primary uppercase text-right hover:underline">
                        + Añadir al inventario
                      </Link>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold">IMEI</Label>
                    <Input 
                      placeholder="15 dígitos" 
                      className="rounded-xl h-12 font-mono"
                      value={imei}
                      onChange={(e) => setImei(e.target.value)}
                      disabled={loading}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold">Precio (COP)</Label>
                    <Input 
                      type="number" 
                      placeholder="Ej: 3500000" 
                      className="rounded-xl h-12 text-lg font-bold"
                      value={initialAmount}
                      onChange={(e) => setInitialAmount(e.target.value)}
                      disabled={loading}
                      required
                    />
                  </div>

                  <div className="space-y-3 col-span-1 md:col-span-2">
                    <div className="flex items-center justify-between">
                      <Label className="font-bold">Cuota Inicial (COP)</Label>
                      <div className="flex gap-2">
                        {[30, 40, 50].map(p => (
                          <Button key={p} type="button" variant="outline" size="sm" className="h-7 text-[10px] font-black rounded-full" onClick={() => handleSetDownPaymentPercentage(p)}>
                            {p}%
                          </Button>
                        ))}
                      </div>
                    </div>
                    <Input 
                      type="number" 
                      className="rounded-xl h-12 text-lg font-bold text-green-700 bg-green-50/30"
                      value={downPayment}
                      onChange={(e) => setDownPayment(e.target.value)}
                      disabled={loading}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <Label className="font-bold">Frecuencia</Label>
                    <Select value={paymentFrequency} onValueChange={(val: any) => setPaymentFrequency(val)} disabled={loading}>
                      <SelectTrigger className="rounded-xl h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="semanal">Semanal</SelectItem>
                        <SelectItem value="quincenal">Quincenal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-4">
                    <Label className="font-bold">Meses</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {['6', '12', '24'].map(num => (
                        <button key={num} type="button" onClick={() => setPlanType(num as any)} className={`p-3 rounded-xl border-2 font-black text-xs ${planType === num ? 'border-primary bg-primary/5' : 'border-slate-100'}`}>
                          {num} Meses
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-6 border-t pt-8">
                  <Label className="text-lg font-black">Documentos Fotográficos</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {[
                      { label: 'Rostro Cliente', type: 'customer', data: capturedPhoto },
                      { label: 'Cédula (Frontal)', type: 'idFront', data: idFrontPhoto },
                      { label: 'Cédula (Posterior)', type: 'idBack', data: idBackPhoto }
                    ].map((btn) => (
                      <div key={btn.type} className="space-y-2 text-center">
                        <p className="text-[10px] font-black uppercase text-slate-400">{btn.label}</p>
                        {!btn.data ? (
                          <Button type="button" onClick={() => startCamera(btn.type as PhotoType)} className="w-full h-32 rounded-2xl border-2 border-dashed bg-primary/5 text-primary flex-col gap-2">
                            <Camera className="w-6 h-6" />
                            <span className="text-[10px] font-bold">Tomar Foto</span>
                          </Button>
                        ) : (
                          <div className="relative rounded-2xl overflow-hidden aspect-[3/4] border-2 border-green-500">
                            <img src={btn.data} className="w-full h-full object-cover" />
                            <button type="button" onClick={() => startCamera(btn.type as PhotoType)} className="absolute bottom-2 right-2 p-2 bg-white rounded-full shadow-lg text-primary">
                              <RefreshCw className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {showCamera && (
                    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
                      <div className="relative w-full max-w-2xl rounded-3xl overflow-hidden border-4 border-primary/20">
                        <video ref={videoRef} autoPlay muted playsInline className="w-full aspect-video object-cover" />
                        <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-6">
                           <Button onClick={capturePhoto} className="rounded-full w-20 h-20 bg-white border-8 border-primary" />
                           <Button variant="secondary" onClick={() => { stopCamera(); setShowCamera(false); }} className="rounded-full w-12 h-12">
                             <X className="w-6 h-6" />
                           </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <Button type="submit" disabled={loading || !capturedPhoto} className="w-full h-16 rounded-2xl text-xl font-black bg-primary">
                  {loading ? "Registrando..." : "Crear Crédito"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-none shadow-2xl bg-primary text-white rounded-[2rem]">
            <CardHeader><CardTitle className="font-black">Resumen</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-xs font-bold opacity-70">Precio</span>
                <span className="font-black">{formatCurrency(parseFloat(initialAmount) || 0)}</span>
              </div>
              <div className="flex justify-between border-b border-white/10 pb-2 text-accent">
                <span className="text-xs font-bold">Cuota Inicial (-)</span>
                <span className="font-black">-{formatCurrency(parseFloat(downPayment) || 0)}</span>
              </div>
              <div className="pt-4 text-center">
                <p className="text-[10px] opacity-60 font-black uppercase">Cuota {paymentFrequency}</p>
                <h2 className="text-4xl font-black">{formatCurrency(calculation.installmentAmount)}</h2>
                <p className="text-xs font-bold text-accent mt-2">{planType} Meses (+{calculation.interestRate}%)</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
