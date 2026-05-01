
"use client";

import React, { useState, useEffect, useRef } from 'react';
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
  User as UserIcon
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

const POPULAR_MODELS = [
  "iPhone 15 Pro Max", "iPhone 15 Pro", "iPhone 15 Plus", "iPhone 15",
  "iPhone 14 Pro Max", "iPhone 14 Pro", "iPhone 13", "iPhone 11",
  "Samsung Galaxy S24 Ultra", "Samsung Galaxy S24+", "Samsung Galaxy S24",
  "Samsung Galaxy S23 Ultra", "Samsung Galaxy A54", "Samsung Galaxy A34",
  "Samsung Galaxy A14", "Samsung Galaxy Z Fold 5", "Samsung Galaxy Z Flip 5",
  "Xiaomi Redmi Note 13 Pro+", "Xiaomi Redmi Note 13", "Xiaomi 14 Ultra",
  "Xiaomi Poco F5 Pro", "Xiaomi Redmi 12C", "Xiaomi 13T Pro",
  "Motorola Edge 40 Pro", "Motorola Moto G84", "Motorola Moto G54",
  "Motorola Razr 40 Ultra", "Google Pixel 8 Pro", "Google Pixel 8",
  "Huawei P60 Pro", "Huawei Nova 11", "Infinix Note 30 Pro",
  "Tecno Camon 20 Pro", "Realme 11 Pro+", "OPPO Reno 10 Pro"
].sort();

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value);
};

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
  const [searchTerm, setSearchTerm] = useState('');
  const [imei, setImei] = useState('');
  const [initialAmount, setInitialAmount] = useState('');
  const [downPayment, setDownPayment] = useState('');
  const [planType, setPlanType] = useState<'6' | '12'>('6');
  
  // Camera state
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

  const [calculation, setCalculation] = useState({
    interestRate: 0,
    financedAmount: 0,
    totalAmount: 0,
    installmentAmount: 0
  });

  const filteredModels = POPULAR_MODELS.filter(m => 
    m.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        installmentAmount: Math.round(installment)
      });
    } else {
      setCalculation({ interestRate: 0, financedAmount: 0, totalAmount: 0, installmentAmount: 0 });
    }
  }, [initialAmount, downPayment, planType]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setHasCameraPermission(true);
        setShowCamera(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        variant: 'destructive',
        title: 'Acceso a Cámara Denegado',
        description: 'Por favor permite el acceso a la cámara para tomar la foto del cliente.',
      });
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
        const photoData = canvasRef.current.toDataURL('image/jpeg');
        setCapturedPhoto(photoData);
        
        // Stop stream
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        setShowCamera(false);
      }
    }
  };

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

    if (!capturedPhoto) {
      toast({
        title: "Foto Requerida",
        description: "Debes tomar una foto del cliente para finalizar el proceso.",
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
      customerPhoto: capturedPhoto,
      createdAt: serverTimestamp(),
    };

    addDoc(collection(db, 'credits'), creditData)
      .then(() => {
        toast({
          title: "Éxito",
          description: "Crédito y foto registrados correctamente.",
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
          <h1 className="text-2xl font-bold tracking-tight">Nueva Solicitud de Crédito (COP)</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 border-none shadow-xl shadow-primary/5">
            <CardHeader className="border-b bg-slate-50/50">
              <CardTitle className="text-lg">Información del Crédito</CardTitle>
              <CardDescription>Detalles del cliente, equipo y fotografía obligatoria</CardDescription>
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
                    <Label htmlFor="device-search">Modelo de Celular (Buscador)</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        id="device-search" 
                        placeholder="Busca el modelo..." 
                        className="pl-10 rounded-xl h-12 mb-2"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        disabled={loading}
                      />
                      <Select onValueChange={setDeviceModel} value={deviceModel} disabled={loading} required>
                        <SelectTrigger className="rounded-xl h-12">
                          <SelectValue placeholder="O elige de la lista..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {filteredModels.map((m) => (
                            <SelectItem key={m} value={m}>{m}</SelectItem>
                          ))}
                          {searchTerm && !POPULAR_MODELS.includes(searchTerm) && (
                             <SelectItem value={searchTerm}>Usar: "{searchTerm}"</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
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
                    <Label htmlFor="amount">Precio Total del Equipo (COP)</Label>
                    <Input 
                      id="amount" 
                      type="number" 
                      placeholder="Ej: 3500000" 
                      className="rounded-xl h-12 text-lg font-semibold"
                      value={initialAmount}
                      onChange={(e) => setInitialAmount(e.target.value)}
                      disabled={loading}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="downPayment">Cuota Inicial / Abono (COP)</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-600" />
                      <Input 
                        id="downPayment" 
                        type="number" 
                        placeholder="Ej: 500000" 
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
                  <Label>Plan de Pagos Quincenales</Label>
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

                {/* Camera Section */}
                <div className="space-y-4 border-t pt-6">
                  <Label className="text-lg font-black flex items-center gap-2">
                    <Camera className="w-5 h-5 text-primary" /> Fotografía del Cliente
                  </Label>
                  
                  {!showCamera && !capturedPhoto && (
                    <Button 
                      type="button" 
                      onClick={startCamera} 
                      className="w-full h-20 rounded-2xl border-2 border-dashed border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 font-bold gap-3"
                    >
                      <Camera className="w-6 h-6" /> Abrir Cámara para Registro
                    </Button>
                  )}

                  {showCamera && (
                    <div className="space-y-4 animate-in fade-in zoom-in duration-300">
                      <div className="relative rounded-2xl overflow-hidden bg-black aspect-video border-4 border-primary/20">
                        <video ref={videoRef} autoPlay muted className="w-full h-full object-cover" />
                        <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                          <Button 
                            type="button" 
                            onClick={capturePhoto} 
                            className="rounded-full w-16 h-16 bg-white hover:bg-slate-200 border-4 border-primary shadow-xl p-0"
                          >
                            <div className="w-10 h-10 rounded-full bg-primary" />
                          </Button>
                        </div>
                      </div>
                      {!hasCameraPermission && (
                        <Alert variant="destructive">
                          <AlertTitle>Acceso Requerido</AlertTitle>
                          <AlertDescription>Por favor permite el acceso a la cámara en tu navegador.</AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}

                  {capturedPhoto && (
                    <div className="relative rounded-2xl overflow-hidden border-4 border-green-500/20 aspect-video group">
                      <img src={capturedPhoto} alt="Foto Cliente" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                        <Button type="button" variant="secondary" onClick={() => { setCapturedPhoto(null); startCamera(); }} className="rounded-xl font-bold">
                          <RefreshCw className="w-4 h-4 mr-2" /> Repetir Foto
                        </Button>
                        <div className="bg-green-500 text-white p-3 rounded-full">
                           <Check className="w-6 h-6" />
                        </div>
                      </div>
                      <canvas ref={canvasRef} className="hidden" />
                    </div>
                  )}
                </div>

                <Button 
                  type="submit" 
                  disabled={loading || calculation.financedAmount <= 0 || !capturedPhoto} 
                  className="w-full h-14 rounded-xl text-lg font-bold shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 text-white"
                >
                  {loading ? "Generando Crédito..." : "Finalizar y Crear Crédito"}
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
                <CardTitle>Resumen Financiero (COP)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 relative z-10">
                <div className="flex justify-between items-center border-b border-white/20 pb-4">
                  <span className="text-sm opacity-80">Precio Equipo</span>
                  <span className="text-xl font-bold">{formatCurrency(parseFloat(initialAmount) || 0)}</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/20 pb-4">
                  <span className="text-sm opacity-80 text-accent font-bold">Cuota Inicial (-)</span>
                  <span className="text-xl font-bold text-accent">-{formatCurrency(parseFloat(downPayment) || 0)}</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/20 pb-4">
                  <span className="text-sm opacity-80">Monto a Financiar</span>
                  <span className="text-xl font-bold">{formatCurrency(calculation.financedAmount)}</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/20 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm opacity-80">Recargo (+{calculation.interestRate}%)</span>
                  </div>
                  <span className="text-xl font-bold text-accent">+{formatCurrency(calculation.totalAmount - calculation.financedAmount)}</span>
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-xs opacity-60 font-bold mb-1">Total a Pagar en Cuotas</p>
                    <h2 className="text-2xl font-extrabold">{formatCurrency(calculation.totalAmount)}</h2>
                  </div>
                  <div className="text-right">
                    <p className="text-xs opacity-60 font-bold mb-1">Cuota Quincenal</p>
                    <h3 className="text-xl font-bold">{formatCurrency(calculation.installmentAmount)}</h3>
                  </div>
                </div>
              </CardContent>
            </Card>

            {capturedPhoto && (
              <Card className="border-none shadow-sm overflow-hidden rounded-[2rem]">
                <CardHeader className="bg-slate-900 text-white py-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <UserIcon className="w-4 h-4" /> Foto de Registro
                  </CardTitle>
                </CardHeader>
                <div className="p-2 bg-white">
                  <img src={capturedPhoto} alt="Previsualización" className="w-full rounded-2xl aspect-[4/3] object-cover" />
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
