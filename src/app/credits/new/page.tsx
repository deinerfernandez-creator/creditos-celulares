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
  Search,
  User as UserIcon,
  X,
  CreditCard as IdCardIcon,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, doc, updateDoc, arrayRemove, increment } from 'firebase/firestore';

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
  
  const [loading, setLoading] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [selectedInventoryId, setSelectedInventoryId] = useState<string | null>(null);
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
    installmentAmount: 0,
    actualInstallmentsCount: 0
  });

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

  const handleInventorySelect = (id: string) => {
    const foundPhone = inventoryPhones?.find(p => p.id === id);
    if (foundPhone) {
      setSelectedInventoryId(id);
      setDeviceModel(`${foundPhone.brand} ${foundPhone.model}`);
      setInitialAmount(foundPhone.salePrice.toString());
      setImei(''); 
    }
  };

  const selectedPhoneData = useMemo(() => {
    if (!selectedInventoryId || !inventoryPhones) return null;
    return inventoryPhones.find(p => p.id === selectedInventoryId);
  }, [selectedInventoryId, inventoryPhones]);

  useEffect(() => {
    const total_price = parseFloat(initialAmount) || 0;
    const down_pay = parseFloat(downPayment) || 0;
    const amountToFinance = Math.max(0, total_price - down_pay);
    
    if (amountToFinance > 0) {
      let interest = 0.5; // 50% interest base for 6-unit stage
      if (planType === '12') interest = 1.0; // 100% for 12-unit stage
      else if (planType === '24') interest = 1.5; // 150% for 24-unit stage

      // Recargo del 10% si el equipo vale menos de 501,000
      if (total_price < 501000) {
        interest += 0.1;
      }

      const totalFinanced = amountToFinance * (1 + interest);
      // To make weekly payment half of bi-weekly, we double the installment count
      const actualInstallmentsCount = paymentFrequency === 'semanal' ? parseInt(planType) * 2 : parseInt(planType);
      const installment = totalFinanced / actualInstallmentsCount;

      setCalculation({
        interestRate: interest * 100,
        financedAmount: amountToFinance,
        totalAmount: totalFinanced,
        installmentAmount: Math.round(installment),
        actualInstallmentsCount
      });
    } else {
      setCalculation({ interestRate: 0, financedAmount: 0, totalAmount: 0, installmentAmount: 0, actualInstallmentsCount: 0 });
    }
  }, [initialAmount, downPayment, planType, paymentFrequency]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !deviceModel || !imei || !initialAmount || downPayment === '' || !paymentFrequency) {
      toast({ title: "Error", description: "Completa todos los campos obligatorios.", variant: "destructive" });
      return;
    }

    if (!capturedPhoto || !idFrontPhoto || !idBackPhoto) {
      toast({ title: "Fotos Requeridas", description: "Faltan documentos fotográficos del cliente.", variant: "destructive" });
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
      planType: calculation.actualInstallmentsCount,
      paymentFrequency,
      installmentAmount: calculation.installmentAmount,
      remainingBalance: calculation.totalAmount,
      status: 'activo',
      customerPhoto: capturedPhoto,
      idFrontPhoto,
      idBackPhoto,
      createdAt: serverTimestamp(),
    };

    try {
      await addDoc(collection(db, 'credits'), creditData);

      if (selectedInventoryId) {
        await updateDoc(doc(db, 'phones', selectedInventoryId), {
          imeis: arrayRemove(imei),
          quantity: increment(-1)
        });
      }

      toast({ title: "Crédito Registrado", description: "El expediente ha sido creado y el stock actualizado." });
      router.push('/dashboard');
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setLoading(false);
    }
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
            <Link href="/dashboard"><ChevronLeft className="w-5 h-5" /></Link>
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
                    <Label className="font-bold">Equipo del Inventario</Label>
                    <Select onValueChange={handleInventorySelect} disabled={loading} required>
                      <SelectTrigger className="rounded-xl h-12 font-bold">
                        <SelectValue placeholder="Elegir del stock..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {inventoryPhones?.filter(p => p.imeis?.length > 0).map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.brand} {p.model} (Stock: {p.imeis.length})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold">IMEI del Equipo</Label>
                    {selectedPhoneData && selectedPhoneData.imeis?.length > 0 ? (
                      <Select onValueChange={setImei} value={imei} disabled={loading} required>
                        <SelectTrigger className="rounded-xl h-12 font-mono">
                          <SelectValue placeholder="Elegir IMEI disponible..." />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedPhoneData.imeis.map((item: string) => (
                            <SelectItem key={item} value={item} className="font-mono">{item}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input 
                        placeholder="IMEI manual" 
                        className="rounded-xl h-12 font-mono"
                        value={imei}
                        onChange={(e) => setImei(e.target.value)}
                        disabled={loading}
                        required
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold">Precio de Venta (COP)</Label>
                    <Input 
                      type="number" 
                      className="rounded-xl h-12 text-lg font-bold"
                      value={initialAmount}
                      onChange={(e) => setInitialAmount(e.target.value)}
                      disabled={loading}
                      required
                    />
                  </div>

                  <div className="space-y-2 col-span-1 md:col-span-2">
                    <Label className="font-bold text-green-700">Cuota Inicial (Abono)</Label>
                    <div className="flex gap-2 mb-2">
                       {[30, 40, 50].map(p => (
                         <Button 
                          key={p} 
                          type="button" 
                          variant="outline" 
                          size="sm" 
                          className="rounded-full text-[10px] font-black"
                          onClick={() => {
                            const price = parseFloat(initialAmount) || 0;
                            setDownPayment(Math.round(price * (p/100)).toString());
                          }}
                         >
                           {p}%
                         </Button>
                       ))}
                    </div>
                    <Input 
                      type="number" 
                      className="rounded-xl h-12 text-lg font-black text-green-700 bg-green-50/30"
                      value={downPayment}
                      onChange={(e) => setDownPayment(e.target.value)}
                      disabled={loading}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <Label className="font-bold">Frecuencia de Pago</Label>
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
                    <Label className="font-bold">Plazo del Crédito</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {['6', '12', '24'].map(num => {
                        const displayNum = paymentFrequency === 'semanal' ? parseInt(num) * 2 : parseInt(num);
                        const label = paymentFrequency === 'semanal' ? 'Semanas' : 'Quincenas';
                        return (
                          <button 
                            key={num} 
                            type="button" 
                            onClick={() => setPlanType(num as any)} 
                            className={`p-3 rounded-xl border-2 font-black text-xs ${planType === num ? 'border-primary bg-primary/5' : 'border-slate-100'}`}
                          >
                            {displayNum} {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="space-y-6 border-t pt-8">
                  <Label className="text-lg font-black">Expediente Fotográfico</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {[
                      { label: 'Cliente', type: 'customer', data: capturedPhoto },
                      { label: 'Cédula (Frontal)', type: 'idFront', data: idFrontPhoto },
                      { label: 'Cédula (Posterior)', type: 'idBack', data: idBackPhoto }
                    ].map((btn) => (
                      <div key={btn.type} className="space-y-2 text-center">
                        <p className="text-[10px] font-black uppercase text-slate-400">{btn.label}</p>
                        {!btn.data ? (
                          <Button type="button" onClick={() => startCamera(btn.type as PhotoType)} className="w-full h-32 rounded-2xl border-2 border-dashed bg-primary/5 text-primary flex-col gap-2">
                            <Camera className="w-6 h-6" />
                            <span className="text-[10px] font-bold">Capturar</span>
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
                           <Button type="button" onClick={capturePhoto} className="rounded-full w-20 h-20 bg-white border-8 border-primary shadow-2xl" />
                           <Button type="button" variant="secondary" onClick={() => { stopCamera(); setShowCamera(false); }} className="rounded-full w-12 h-12 bg-white/20 text-white backdrop-blur-md">
                             <X className="w-6 h-6" />
                           </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <Button type="submit" disabled={loading || !capturedPhoto} className="w-full h-16 rounded-2xl text-xl font-black bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20">
                  {loading ? "Procesando..." : "Habilitar Crédito"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-none shadow-2xl bg-primary text-white rounded-[2.5rem] h-fit">
            <CardHeader><CardTitle className="font-black">Resumen del Plan</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-xs font-bold opacity-70">Precio del Equipo</span>
                <span className="font-black">{formatCurrency(parseFloat(initialAmount) || 0)}</span>
              </div>
              <div className="flex justify-between border-b border-white/10 pb-2 text-accent">
                <span className="text-xs font-bold">Abono Inicial (-)</span>
                <span className="font-black">-{formatCurrency(parseFloat(downPayment) || 0)}</span>
              </div>
              <div className="pt-4 text-center">
                <p className="text-[10px] opacity-60 font-black uppercase tracking-widest">Valor Cuota {paymentFrequency}</p>
                <h2 className="text-4xl font-black">{formatCurrency(calculation.installmentAmount)}</h2>
                <p className="text-xs font-bold text-accent mt-2">{calculation.actualInstallmentsCount} {paymentFrequency === 'semanal' ? 'Semanas' : 'Quincenas'} (+{calculation.interestRate}%)</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
