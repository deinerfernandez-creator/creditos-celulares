
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
  User as UserIcon,
  X
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
    setShowCamera(true);
    setCapturedPhoto(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setHasCameraPermission(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setHasCameraPermission(false);
      setShowCamera(false);
      toast({
        variant: 'destructive',
        title: 'Error de Cámara',
        description: 'No se pudo acceder a la cámara. Revisa los permisos de tu navegador.',
      });
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context && video.videoWidth > 0) {
        // Ajustar canvas al tamaño del video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Dibujar frame actual del video en el canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convertir a Base64
        const photoData = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedPhoto(photoData);
        
        // Detener la cámara
        stopCamera();
        setShowCamera(false);
        
        toast({
          title: "Foto Capturada",
          description: "La imagen se ha guardado correctamente.",
        });
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

  // Limpiar cámara si se desmonta el componente
  useEffect(() => {
    return () => stopCamera();
  }, []);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 flex items-center justify-center">
      {/* Canvas oculto necesario para la captura - SIEMPRE EN EL DOM */}
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
              <CardDescription className="text-xs uppercase font-bold text-slate-400 tracking-widest">Detalles del cliente, equipo y fotografía obligatoria</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="customer" className="font-bold">Cliente</Label>
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
                    <Label htmlFor="device-search" className="font-bold">Modelo de Celular</Label>
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
                    <Label htmlFor="imei" className="font-bold">IMEI del Equipo</Label>
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
                    <Label htmlFor="amount" className="font-bold">Precio Total (COP)</Label>
                    <Input 
                      id="amount" 
                      type="number" 
                      placeholder="Ej: 3500000" 
                      className="rounded-xl h-12 text-lg font-bold"
                      value={initialAmount}
                      onChange={(e) => setInitialAmount(e.target.value)}
                      disabled={loading}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="downPayment" className="font-bold">Cuota Inicial (COP)</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-600" />
                      <Input 
                        id="downPayment" 
                        type="number" 
                        placeholder="Ej: 500000" 
                        className="pl-10 rounded-xl h-12 text-lg font-bold text-green-700 bg-green-50/30"
                        value={downPayment}
                        onChange={(e) => setDownPayment(e.target.value)}
                        disabled={loading}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="font-bold">Plan de Pagos</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      type="button"
                      disabled={loading || calculation.financedAmount <= 0}
                      onClick={() => setPlanType('6')}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${planType === '6' ? 'border-primary bg-primary/5' : 'border-slate-100 hover:border-slate-200'} ${calculation.financedAmount <= 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <p className="font-black text-lg text-primary tracking-tight">6 Cuotas</p>
                      <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Recargo del 50%</p>
                    </button>
                    <button
                      type="button"
                      disabled={loading || calculation.financedAmount <= 0}
                      onClick={() => setPlanType('12')}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${planType === '12' ? 'border-primary bg-primary/5' : 'border-slate-100 hover:border-slate-200'} ${calculation.financedAmount <= 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <p className="font-black text-lg text-primary tracking-tight">12 Cuotas</p>
                      <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Recargo del 100%</p>
                    </button>
                  </div>
                </div>

                {/* Camera Section */}
                <div className="space-y-4 border-t pt-8">
                  <Label className="text-lg font-black flex items-center gap-2 text-slate-900">
                    <Camera className="w-5 h-5 text-primary" /> Registro Fotográfico
                  </Label>
                  
                  {!showCamera && !capturedPhoto && (
                    <Button 
                      type="button" 
                      onClick={startCamera} 
                      className="w-full h-24 rounded-3xl border-2 border-dashed border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 font-black gap-3 text-lg"
                    >
                      <Camera className="w-8 h-8" /> Iniciar Cámara
                    </Button>
                  )}

                  {showCamera && (
                    <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                      <div className="relative rounded-3xl overflow-hidden bg-black aspect-video border-4 border-primary/20 shadow-2xl">
                        <video 
                          ref={videoRef} 
                          autoPlay 
                          muted 
                          playsInline
                          className="w-full h-full object-cover" 
                        />
                        
                        <div className="absolute bottom-8 left-0 right-0 flex justify-center items-center gap-6">
                           <Button 
                            type="button" 
                            onClick={capturePhoto} 
                            className="rounded-full w-20 h-20 bg-white hover:bg-slate-100 border-8 border-primary shadow-2xl flex items-center justify-center p-0 transition-transform active:scale-95"
                          >
                             <div className="w-12 h-12 rounded-full bg-primary" />
                          </Button>
                          <Button 
                            type="button" 
                            variant="secondary"
                            size="icon"
                            onClick={() => { stopCamera(); setShowCamera(false); }}
                            className="rounded-full w-12 h-12 bg-white/20 text-white backdrop-blur-md border border-white/30"
                          >
                             <X className="w-6 h-6" />
                          </Button>
                        </div>
                      </div>
                      
                      {!hasCameraPermission && (
                        <Alert variant="destructive" className="rounded-2xl">
                          <AlertTitle className="font-black">Cámara no detectada</AlertTitle>
                          <AlertDescription>Por favor, haz clic en "Iniciar Cámara" o revisa los permisos de tu navegador.</AlertDescription>
                        </Alert>
                      )}
                      
                      <p className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                        Asegúrate de que el rostro del cliente sea claramente visible
                      </p>
                    </div>
                  )}

                  {capturedPhoto && (
                    <div className="relative rounded-3xl overflow-hidden border-4 border-green-500/20 aspect-video group shadow-xl">
                      <img src={capturedPhoto} alt="Foto Cliente" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-6">
                        <div className="bg-green-500 text-white p-4 rounded-full shadow-2xl scale-110">
                           <Check className="w-10 h-10" />
                        </div>
                        <Button 
                          type="button" 
                          variant="secondary" 
                          onClick={startCamera} 
                          className="rounded-2xl font-black uppercase text-xs tracking-widest h-12 px-8 bg-white text-slate-900"
                        >
                          <RefreshCw className="w-4 h-4 mr-3" /> Tomar Otra Foto
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <Button 
                  type="submit" 
                  disabled={loading || calculation.financedAmount <= 0 || !capturedPhoto} 
                  className="w-full h-16 rounded-2xl text-xl font-black shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90 text-white tracking-tight"
                >
                  {loading ? "Registrando expediente..." : "Finalizar y Crear Crédito"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border-none shadow-2xl bg-primary text-white overflow-hidden relative rounded-[2rem]">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Smartphone className="w-32 h-32" />
              </div>
              <CardHeader>
                <CardTitle className="font-black tracking-tight">Resumen Financiero</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 relative z-10">
                <div className="flex justify-between items-center border-b border-white/20 pb-4">
                  <span className="text-xs font-bold opacity-70 uppercase tracking-widest">Precio Equipo</span>
                  <span className="text-xl font-black">{formatCurrency(parseFloat(initialAmount) || 0)}</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/20 pb-4">
                  <span className="text-xs font-bold text-accent uppercase tracking-widest">Cuota Inicial (-)</span>
                  <span className="text-xl font-black text-accent">-{formatCurrency(parseFloat(downPayment) || 0)}</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/20 pb-4">
                  <span className="text-xs font-bold opacity-70 uppercase tracking-widest">Monto Neto</span>
                  <span className="text-xl font-black">{formatCurrency(calculation.financedAmount)}</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/20 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold opacity-70 uppercase tracking-widest">Recargo ({calculation.interestRate}%)</span>
                  </div>
                  <span className="text-xl font-black text-accent">+{formatCurrency(calculation.totalAmount - calculation.financedAmount)}</span>
                </div>
                <div className="pt-4">
                  <p className="text-[10px] opacity-60 font-black uppercase tracking-widest mb-2">Total a Financiar</p>
                  <h2 className="text-4xl font-black tracking-tighter">{formatCurrency(calculation.totalAmount)}</h2>
                  
                  <div className="mt-6 p-4 bg-white/10 rounded-2xl border border-white/10">
                    <p className="text-[10px] opacity-60 font-black uppercase tracking-widest mb-1">Valor de la Cuota Quincenal</p>
                    <h3 className="text-2xl font-black text-accent">{formatCurrency(calculation.installmentAmount)}</h3>
                  </div>
                </div>
              </CardContent>
            </Card>

            {capturedPhoto && (
              <Card className="border-none shadow-lg overflow-hidden rounded-[2rem]">
                <CardHeader className="bg-slate-900 text-white py-4">
                  <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                    <UserIcon className="w-4 h-4 text-primary" /> Foto del Registro
                  </CardTitle>
                </CardHeader>
                <div className="p-3 bg-white">
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
