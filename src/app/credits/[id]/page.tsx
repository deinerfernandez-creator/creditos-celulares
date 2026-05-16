"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  Loader2,
  Smartphone,
  AlertCircle,
  Phone,
  Settings2,
  CheckCircle2,
  History,
  TrendingUp,
  Receipt,
  Trash2,
  CalendarDays,
  Clock,
  User as UserIcon,
  DollarSign,
  Printer,
  FileText,
  ShieldAlert,
  Camera,
  X,
  RefreshCw,
  FileSignature,
  Building2,
  MapPin,
  MessageCircle,
  QrCode,
  Copy,
  ExternalLink
} from 'lucide-react';
import { 
  useFirestore, 
  useDoc, 
  useCollection, 
  useMemoFirebase,
  deleteDocumentNonBlocking,
  useUser
} from '@/firebase';
import { 
  doc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  addDoc, 
  serverTimestamp, 
  increment 
} from 'firebase/firestore';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { setDeviceLockStatus } from '@/app/actions/mdm';

const formatCurrency = (value: any) => {
  const num = Number(value);
  if (isNaN(num)) return '$ 0';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(num);
};

// Función auxiliar para convertir números a letras (Pesos Colombianos)
function numeroALetras(num: number): string {
  const unidades = ["", "UN", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"];
  const decenas = ["DIEZ", "VEINTE", "TREINTA", "CUARENTA", "CUARENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
  const especiales = ["ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISEIS", "DIECISIETE", "DIECIOCHO", "DIECINUEVE"];
  const centenas = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"];

  const convertirSeccion = (n: number) => {
    let output = "";
    if (n === 100) return "CIEN";
    if (n >= 100) {
      output += centenas[Math.floor(n / 100)] + " ";
      n %= 100;
    }
    if (n >= 10 && n <= 19) {
      if (n === 10) output += "DIEZ";
      else output += especiales[n - 11];
      n = 0;
    } else if (n >= 20) {
      output += decenas[Math.floor(n / 10) - 1];
      if (n % 10 > 0) output += " Y " + unidades[n % 10];
      n = 0;
    }
    if (n > 0) output += unidades[n];
    return output.trim();
  };

  if (num === 0) return "CERO PESOS M/CTE";
  
  let letras = "";
  if (num >= 1000000) {
    const millones = Math.floor(num / 1000000);
    letras += (millones === 1 ? "UN MILLÓN" : convertirSeccion(millones) + " MILLONES") + " ";
    num %= 1000000;
  }
  if (num >= 1000) {
    const miles = Math.floor(num / 1000);
    letras += (miles === 1 ? "MIL" : convertirSeccion(miles) + " MIL") + " ";
    num %= 1000;
  }
  if (num > 0) {
    letras += convertirSeccion(num) + " ";
  }

  return letras.trim() + " PESOS M/CTE";
}

export default function CreditDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const db = useFirestore();
  const { toast } = useToast();
  const { role } = useUser();

  const [mounted, setMounted] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [isMdmUpdating, setIsMdmUpdating] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [openPayment, setOpenPayment] = useState(false);
  const [openContract, setOpenContract] = useState(false);
  const [openPromissory, setOpenPromissory] = useState(false);
  const [activePrintDoc, setActivePrintDoc] = useState<'contract' | 'promissory' | null>(null);

  // Camera state for Delivery Photo
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState(false);

  const logo = PlaceHolderImages.find(img => img.id === 'logo-tecnicell');
  const qrNequi = PlaceHolderImages.find(img => img.id === 'qr-nequi');

  useEffect(() => {
    setMounted(true);
  }, []);

  const creditRef = useMemoFirebase(() => id && mounted ? doc(db, 'credits', id) : null, [db, id, mounted]);
  const { data: credit, isLoading: loadingCredit } = useDoc(creditRef);

  const customerRef = useMemoFirebase(() => credit?.customerId && mounted ? doc(db, 'customers', credit.customerId) : null, [db, credit?.customerId, mounted]);
  const { data: customer, isLoading: loadingCustomer } = useDoc(customerRef);

  const paymentsQuery = useMemoFirebase(() => {
    if (!id || !db || !mounted) return null;
    return query(collection(db, 'payments'), where("creditId", "==", id));
  }, [db, id, mounted]);
  const { data: paymentsData, isLoading: loadingPayments } = useCollection(paymentsQuery);

  const payments = useMemo(() => {
    if (!paymentsData) return null;
    return [...paymentsData].sort((a, b) => {
      const dateA = a.date?.seconds || 0;
      const dateB = b.date?.seconds || 0;
      return dateB - dateA;
    });
  }, [paymentsData]);

  const schedule = useMemo(() => {
    if (!credit?.createdAt || !credit?.planType || !credit?.installmentAmount) return [];
    
    const startDate = credit.createdAt.toDate ? credit.createdAt.toDate() : new Date(credit.createdAt);
    const totalPaymentsMade = paymentsData ? paymentsData.reduce((sum, p) => sum + p.amount, 0) : 0;
    const frequencyDays = credit.paymentFrequency === 'semanal' ? 7 : 15;
    
    const items = [];
    for (let i = 1; i <= credit.planType; i++) {
      const dueDate = new Date(startDate);
      dueDate.setDate(dueDate.getDate() + (i * frequencyDays));
      
      const threshold = i * credit.installmentAmount;
      const isPaid = totalPaymentsMade >= threshold;

      items.push({
        index: i,
        date: dueDate,
        amount: credit.installmentAmount,
        isPaid
      });
    }
    return items;
  }, [credit, paymentsData]);

  const handleStatusChange = async (newStatus: string) => {
    if (!id || !db) return;
    setUpdating(true);
    try {
      await updateDoc(doc(db, 'credits', id), { status: newStatus });
      toast({ title: "Estado actualizado", description: `El crédito ahora está ${newStatus}.` });
    } catch (err: any) {
      toast({ title: "Error", description: "No se pudo actualizar el estado.", variant: "destructive" });
    } finally {
      setUpdating(false);
    }
  };

  const handleMdmAction = async (action: 'lock' | 'unlock') => {
    if (!credit?.imei || !id) return;
    setIsMdmUpdating(true);
    
    try {
      const result = await setDeviceLockStatus(credit.imei, action === 'lock');
      
      if (result.success) {
        await updateDoc(doc(db, 'credits', id), { isMdmLocked: action === 'lock' });
        toast({ 
          title: "MDM Actualizado", 
          description: action === 'lock' ? "El dispositivo ha sido bloqueado exitosamente." : "El dispositivo ha sido desbloqueado." 
        });
      } else {
        toast({ 
          title: "Error MDM", 
          description: result.error || "Hubo un problema al comunicar con ManageEngine.", 
          variant: "destructive" 
        });
      }
    } catch (err) {
      toast({ title: "Error", description: "Ocurrió un error inesperado.", variant: "destructive" });
    } finally {
      setIsMdmUpdating(false);
    }
  };

  const handleProcessPayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0 || !id || !db || !credit) return;

    setUpdating(true);
    try {
      await addDoc(collection(db, 'payments'), {
        creditId: id,
        amount: amount,
        date: serverTimestamp()
      });

      const newBalance = Math.max(0, credit.remainingBalance - amount);
      const updateData: any = { remainingBalance: increment(-amount) };
      
      if (newBalance <= 100) {
        updateData.status = 'pagado';
        updateData.remainingBalance = 0;
      }

      await updateDoc(doc(db, 'credits', id), updateData);

      toast({ title: "Abono Procesado", description: "El saldo ha sido actualizado correctamente." });
      setPaymentAmount('');
      setOpenPayment(false);
    } catch (err: any) {
      toast({ title: "Error", description: "No se pudo procesar el pago.", variant: "destructive" });
    } finally {
      setUpdating(false);
    }
  };

  const startCamera = async () => {
    setShowCamera(true);
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
        description: 'No se pudo acceder a la cámara para la foto de entrega.',
      });
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setShowCamera(false);
  };

  const captureDeliveryPhoto = async () => {
    if (videoRef.current && canvasRef.current && id) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context && video.videoWidth > 0) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const photoData = canvas.toDataURL('image/jpeg', 0.8);
        
        setUpdating(true);
        try {
          await updateDoc(doc(db, 'credits', id), { deliveryPhoto: photoData });
          toast({ title: "Foto Guardada", description: "La foto de entrega ha sido anexada al expediente." });
          stopCamera();
        } catch (err: any) {
          toast({ title: "Error", description: "No se pudo guardar la foto.", variant: "destructive" });
        } finally {
          setUpdating(false);
        }
      }
    }
  };

  const handleDeleteCredit = () => {
    if (role !== 'admin') return;
    if (!id || !db) return;
    deleteDocumentNonBlocking(doc(db, 'credits', id));
    toast({ title: "Expediente Eliminado", description: "El crédito ha sido removido satisfactoriamente." });
    router.push('/dashboard');
  };

  const handlePrint = (type: 'contract' | 'promissory') => {
    setActivePrintDoc(type);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const progress = useMemo(() => {
    if (!credit?.totalAmount || !credit?.remainingBalance) return 0;
    const paid = credit.totalAmount - credit.remainingBalance;
    return Math.min(100, Math.max(0, (paid / credit.totalAmount) * 100));
  }, [credit]);

  useEffect(() => {
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  if (!mounted) return null;

  if (loadingCredit || loadingCustomer) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-[10px] font-black uppercase text-slate-400 mt-4 tracking-widest">Cargando expediente...</p>
      </div>
    );
  }

  if (!credit) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-slate-50">
        <AlertCircle className="w-16 h-16 text-destructive/20 mb-6" />
        <h2 className="text-2xl font-black text-slate-900">Crédito no encontrado</h2>
        <Button asChild className="mt-8 rounded-xl"><Link href="/dashboard">Volver</Link></Button>
      </div>
    );
  }

  const contractDate = credit.createdAt?.toDate ? credit.createdAt.toDate().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('es-CO');

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-body print:p-0 print:bg-white">
      <canvas ref={canvasRef} className="hidden" />
      
      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild className="rounded-xl bg-white shadow-sm">
              <Link href="/dashboard"><ChevronLeft className="w-5 h-5" /></Link>
            </Button>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Expediente Financiero</h1>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Crédito #{id.slice(0, 8)}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="rounded-xl font-bold border-accent/20 text-accent bg-white hover:bg-accent/5">
                  <QrCode className="w-4 h-4 mr-2" /> Medios de Pago
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-[2.5rem] sm:max-w-[500px] bg-slate-900 border-slate-800 p-0 overflow-hidden">
                <Tabs defaultValue="nequi" className="w-full">
                  <div className="p-6 bg-slate-900 border-b border-slate-800">
                    <DialogHeader className="mb-4">
                      <DialogTitle className="text-2xl font-black text-white text-center">Opciones de Pago</DialogTitle>
                    </DialogHeader>
                    <TabsList className="grid w-full grid-cols-2 bg-slate-800 rounded-xl p-1">
                      <TabsTrigger value="nequi" className="rounded-lg font-bold data-[state=active]:bg-primary">Nequi</TabsTrigger>
                      <TabsTrigger value="efectivo" className="rounded-lg font-bold data-[state=active]:bg-primary">Efectivo</TabsTrigger>
                    </TabsList>
                  </div>

                  <div className="p-8 bg-slate-900">
                    <TabsContent value="nequi" className="mt-0 space-y-6 flex flex-col items-center">
                      <div className="relative w-64 h-64 bg-white rounded-2xl shadow-2xl p-4 flex items-center justify-center overflow-hidden">
                        <Image 
                          src={qrNequi?.imageUrl || "https://picsum.photos/seed/tecnicell-nequi-qr/600/800"} 
                          alt="Nequi QR" 
                          fill 
                          className="object-contain p-4"
                        />
                      </div>
                      <div className="text-center space-y-2">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Nequi Tecnicell</p>
                        <p className="text-2xl font-black text-white">311 625 1841</p>
                        <p className="text-[10px] text-accent font-bold">DEINER FERNANDEZ</p>
                      </div>
                    </TabsContent>

                    <TabsContent value="efectivo" className="mt-0 space-y-6">
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-primary/20 rounded-xl shrink-0">
                            <MapPin className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Punto Físico</p>
                            <p className="text-sm font-bold text-white leading-relaxed">
                              SANTA FE LAS CLARAS (RIO VERDE) CORDOBA COLOMBIA
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-accent/20 rounded-xl shrink-0">
                            <Clock className="w-6 h-6 text-accent" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Horarios de Atención</p>
                            <p className="text-sm font-bold text-white leading-relaxed">
                              Lunes a Domingo: 8:00 AM - 12:30 PM<br/>
                              Y de 2:00 PM - 6:00 PM
                            </p>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  </div>
                </Tabs>
              </DialogContent>
            </Dialog>

            <Dialog open={openContract} onOpenChange={setOpenContract}>
              <DialogTrigger asChild>
                <Button variant="outline" className="rounded-xl font-bold border-primary/20 text-primary bg-white hover:bg-primary/5">
                  <FileText className="w-4 h-4 mr-2" /> Contrato
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-2xl max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="font-black text-center text-xl">Contrato de Financiación de Equipo Celular</DialogTitle>
                </DialogHeader>
                <div id="contract-content" className="space-y-6 py-6 text-sm text-slate-700 leading-relaxed font-medium">
                  <div className="flex justify-between items-center border-b pb-4">
                     <Image src={logo?.imageUrl || '/logo.png'} alt="Tecnicell" width={60} height={60} />
                     <div className="text-right">
                        <p className="font-black text-slate-900">Tecnicell Créditos</p>
                        <p className="text-[10px] uppercase font-bold text-slate-400">Servicio Técnico y Accesorios</p>
                        <p className="text-[10px] font-black">NIT: 1003078186</p>
                     </div>
                  </div>
                  
                  <section className="space-y-4">
                    <p>En el municipio <strong>SANTA FE LAS CLARAS (RIO VERDE) CORDOBA COLOMBIA</strong>, a los <strong>{contractDate}</strong>, se celebra el presente contrato entre <strong>TECNICELL CRÉDITOS</strong> (El Acreedor) y <strong>{customer?.name}</strong> identificado con cédula <strong>{customer?.cedula}</strong> (El Cliente).</p>
                    
                    <div className="p-4 bg-slate-50 rounded-xl space-y-2">
                       <p className="font-black text-slate-900 border-b pb-1">DATOS DEL EQUIPO Y CRÉDITO</p>
                       <p><strong>Equipo:</strong> {credit.deviceModel}</p>
                       <p><strong>IMEI:</strong> {credit.imei}</p>
                       <p><strong>Precio Total:</strong> {formatCurrency(credit.initialAmount)}</p>
                       <p><strong>Cuota Inicial:</strong> {formatCurrency(credit.downPayment)}</p>
                       <p><strong>Saldo a Financiar:</strong> {formatCurrency(credit.totalAmount)} (Incluye Recargos)</p>
                       <p><strong>Plan:</strong> {credit.planType} Cuotas <span className="capitalize">{credit.paymentFrequency}s</span> de {formatCurrency(credit.installmentAmount)}</p>
                    </div>

                    <div className="space-y-4">
                       <p><strong>CLÁUSULA PRIMERA - RESERVA DE DOMINIO:</strong> El equipo celular descrito anteriormente seguirá siendo propiedad de TECNICELL CRÉDITOS hasta que el saldo total sea cancelado en su totalidad.</p>
                       
                       <p className="bg-primary/5 p-4 rounded-xl border border-primary/10">
                         <strong>CLÁUSULA SEGUNDA - INCUMPLIMIENTO Y MORA:</strong> El CLIENTE se compromete a realizar los pagos <span className="capitalize">{credit.paymentFrequency}es</span> según el cronograma acordado. 
                         <strong className="text-primary block mt-2">Si el CLIENTE dejare de abonar cualquier cuota por un periodo superior a DOS (2) MESES calendario, TECNICELL CRÉDITOS procederá a RECOGER EL EQUIPO CELULAR.</strong>
                         En este caso, el CLIENTE perderá la totalidad de los abonos y la cuota inicial realizados hasta la fecha, por concepto de arrendamiento y depreciación del equipo, a menos que exista un acuerdo previo por escrito.
                       </p>

                       <p><strong>CLÁUSULA TERCERA - BLOQUEO REMOTO:</strong> El cliente acepta que el equipo cuenta con sistemas de administración remota que serán activados en caso de mora superior a 1 día después de la fecha de pago, impidiendo el uso total del dispositivo hasta su puesta al día.</p>
                       
                       <p className="bg-destructive/5 p-4 rounded-xl border border-destructive/10">
                         <strong>CLÁUSULA CUARTA - USO INADECUADO:</strong> Si el cliente hace uso inadecuado del equipo como <strong>formateos, bypass y tratar de desbloquear el equipo</strong>, será tomado como una <strong>NEGATIVA AL PAGO</strong> y se procederá a recoger dicho equipo de manera inmediata.
                       </p>

                       <p><strong>CLÁUSULA QUINTA - REPORTE A CENTRALES DE RIESGO:</strong> El CLIENTE autoriza expresamente a TECNICELL CRÉDITOS para que, en caso de mora o negativa al pago, reporte el incumplimiento de las obligaciones ante las centrales de información crediticia y de riesgo (Datacrédito, CIFIN, etc.), lo cual afectará negativamente su historial crediticio.</p>
                    </div>
                  </section>

                  <div className="pt-20 grid grid-cols-3 gap-10 items-end">
                     <div className="border-t border-slate-900 pt-2 text-center">
                        <p className="font-black text-[10px] uppercase">Firma del Cliente</p>
                        <p className="text-[10px]">{customer?.name}</p>
                     </div>
                     <div className="flex flex-col items-center gap-1">
                        <div className="w-16 h-20 border border-slate-400 rounded-md" />
                        <p className="text-[8px] font-black uppercase">Huella</p>
                     </div>
                     <div className="border-t border-slate-900 pt-2 text-center">
                        <p className="font-black text-[10px] uppercase">Tecnicell Créditos</p>
                        <p className="text-[10px]">Nit. 1003078186</p>
                     </div>
                  </div>
                </div>
                <DialogFooter className="print:hidden">
                  <Button variant="outline" onClick={() => setOpenContract(false)} className="rounded-xl">Cerrar</Button>
                  <Button onClick={() => handlePrint('contract')} className="rounded-xl bg-primary">
                    <Printer className="w-4 h-4 mr-2" /> Imprimir Contrato
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={openPromissory} onOpenChange={setOpenPromissory}>
              <DialogTrigger asChild>
                <Button variant="outline" className="rounded-xl font-bold border-accent/20 text-accent bg-white hover:bg-accent/5">
                  <FileSignature className="w-4 h-4 mr-2" /> Letra de Cambio
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-2xl max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="font-black text-center text-xl">Letra de Cambio No. {id.slice(0, 8).toUpperCase()}</DialogTitle>
                </DialogHeader>
                <div id="promissory-content" className="space-y-8 py-8 text-sm text-slate-800 leading-relaxed font-medium border-y my-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase font-black text-slate-400">Lugar y Fecha</p>
                      <p>SANTA FE LAS CLARAS (RIO VERDE) CORDOBA COLOMBIA, {contractDate}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase font-black text-slate-400">Por Valor de:</p>
                      <p className="text-2xl font-black text-slate-900">{formatCurrency(credit.totalAmount)}</p>
                    </div>
                  </div>

                  <p className="text-justify indent-8">
                    Señor(a) <strong>{customer?.name}</strong>, identificado(a) con cédula de ciudadanía No. <strong>{customer?.cedula}</strong>, domiciliado(a) en <strong>{customer?.address || 'N/A'}</strong>, se obliga a pagar incondicionalmente por esta <strong>LETRA DE CAMBIO</strong> a la orden de <strong>TECNICELL CRÉDITOS (Nit: 1003078186)</strong>, la suma de <strong>{numeroALetras(credit.totalAmount)}</strong> ({credit.totalAmount.toLocaleString('es-CO')} Pesos M/CTE), en cuotas <span className="capitalize">{credit.paymentFrequency}es</span> según plan de pagos anexo, o a su vencimiento final.
                  </p>

                  <div className="space-y-4 text-xs italic opacity-80">
                    <p>En caso de mora en el pago de una o más cuotas, se causarán intereses de mora a la tasa máxima legal permitida. Así mismo, la mora en cualquier obligación facultará al tenedor de este título para declarar vencidos todos los plazos y exigir el pago total de la deuda (Cláusula de Aceleración).</p>
                    <p>Autorizo expresamente a TECNICELL CRÉDITOS para reportar mi comportamiento crediticio ante las centrales de riesgo y bases de datos financieras.</p>
                  </div>

                  <div className="pt-24 grid grid-cols-2 gap-20 items-end px-10">
                    <div className="border-t-2 border-slate-900 pt-4 relative">
                      <p className="font-black text-[10px] uppercase mb-1">Firma del Deudor</p>
                      <p className="text-[10px]">{customer?.name}</p>
                      <p className="text-[10px]">C.C. {customer?.cedula}</p>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-20 h-28 border-2 border-slate-900 rounded-md" />
                      <p className="text-[10px] font-black uppercase">Huella Dactilar</p>
                    </div>
                  </div>
                </div>
                <DialogFooter className="print:hidden">
                  <Button variant="outline" onClick={() => setOpenPromissory(false)} className="rounded-xl">Cerrar</Button>
                  <Button onClick={() => handlePrint('promissory')} className="rounded-xl bg-accent text-white">
                    <Printer className="w-4 h-4 mr-2" /> Imprimir Letra
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {role === 'admin' && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="rounded-xl font-bold text-destructive border-destructive/20 hover:bg-destructive/5">
                    <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-2xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="font-black">¿Borrar definitivamente?</AlertDialogTitle>
                    <AlertDialogDescription>Esta acción eliminará permanentemente este expediente de crédito y todo su historial de pagos. No se puede revertir.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-xl font-bold">Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteCredit} className="bg-destructive text-white hover:bg-destructive/90 rounded-xl font-bold">Eliminar Expediente</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            <Dialog open={openPayment} onOpenChange={setOpenPayment}>
              <DialogTrigger asChild>
                <Button className="rounded-xl font-bold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/10">
                  <Receipt className="w-4 h-4 mr-2" /> Registrar Abono
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-2xl sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="font-black">Registrar Pago en Efectivo</DialogTitle>
                  <DialogDescription>Ingresa el monto recibido para actualizar el saldo del equipo.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="pay-amount">Monto del Abono (COP)</Label>
                    <Input 
                      id="pay-amount" 
                      type="number" 
                      placeholder="Ejem: 50000"
                      className="rounded-xl h-12 text-lg font-bold"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                    />
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Saldo Actual</p>
                     <p className="text-xl font-black text-slate-900">{formatCurrency(credit.remainingBalance)}</p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpenPayment(false)} className="rounded-xl font-bold">Cancelar</Button>
                  <Button onClick={handleProcessPayment} disabled={updating || !paymentAmount} className="rounded-xl font-bold">Procesar Pago</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <div className="flex items-center gap-2 bg-white p-1 rounded-xl shadow-sm border border-slate-100">
              <Settings2 className="w-4 h-4 text-slate-400 ml-2" />
              <Select onValueChange={handleStatusChange} defaultValue={credit.status} disabled={updating}>
                <SelectTrigger className="w-[120px] border-none shadow-none focus:ring-0 h-8 font-bold capitalize text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="activo" className="text-green-600 font-bold">Activo</SelectItem>
                  <SelectItem value="pagado" className="text-primary font-bold">Pagado</SelectItem>
                  <SelectItem value="bloqueado" className="text-destructive font-bold">Bloqueado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="border-none shadow-sm rounded-[2rem] overflow-hidden bg-white">
            <CardHeader className="bg-primary text-white pb-6">
              <CardTitle className="flex items-center gap-2 text-base font-black">
                <UserIcon className="w-5 h-5" /> Perfil del Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 flex flex-col sm:flex-row gap-6">
              {credit.customerPhoto && (
                <div className="w-full sm:w-32 h-40 rounded-2xl overflow-hidden border-2 border-slate-100 shadow-sm shrink-0">
                  <img src={credit.customerPhoto} alt="Foto Cliente" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="space-y-6 flex-1">
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Nombre Completo</p>
                  <p className="font-black text-xl text-slate-900">{customer?.name || '---'}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Cédula</p>
                    <p className="font-bold text-slate-700">{customer?.cedula || '---'}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Teléfono</p>
                    <p className="font-bold text-primary flex items-center gap-2">
                      <Phone className="w-3 h-3" /> {customer?.phone || '---'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm rounded-[2rem] overflow-hidden bg-white">
            <CardHeader className="bg-slate-900 text-white pb-6">
              <CardTitle className="flex items-center gap-2 text-base font-black">
                <Smartphone className="w-5 h-5 text-accent" /> Datos del Equipo
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Modelo Comercial</p>
                  <p className="font-black text-2xl text-primary">{credit.deviceModel}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">IMEI</p>
                  <p className="font-mono text-xs bg-slate-100 px-3 py-1.5 rounded-xl text-slate-600 border border-slate-200">{credit.imei}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 rounded-[1.5rem] border border-slate-100">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Cuota Inicial</p>
                  <p className="text-lg font-black text-green-600">{formatCurrency(credit.downPayment)}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-[1.5rem] border border-slate-100">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Saldo Actual</p>
                  <p className="text-lg font-black text-slate-900">{formatCurrency(credit.remainingBalance)}</p>
                </div>
                <div className="p-4 bg-primary/5 rounded-[1.5rem] border border-primary/10 text-right">
                  <div className="flex items-center justify-end gap-2 mb-1">
                    <TrendingUp className="w-3 h-3 text-primary" />
                    <p className="text-[10px] font-black uppercase text-primary tracking-widest">Progreso</p>
                  </div>
                  <p className="text-xl font-black text-primary">{Math.round(progress)}%</p>
                </div>
              </div>
              
              {role === 'admin' && (
                <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className={`w-5 h-5 ${credit.isMdmLocked ? 'text-destructive' : 'text-slate-400'}`} />
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-0.5">Control MDM Remoto</p>
                      {credit.isMdmLocked ? (
                        <Badge variant="destructive" className="font-bold text-[10px]">Bloqueado</Badge>
                      ) : (
                        <Badge variant="outline" className="font-bold text-[10px] text-green-600 border-green-200 bg-green-50">Normal</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!credit.isMdmLocked ? (
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        className="rounded-xl font-bold w-full sm:w-auto"
                        onClick={() => handleMdmAction('lock')}
                        disabled={isMdmUpdating || updating}
                      >
                        {isMdmUpdating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldAlert className="w-4 h-4 mr-2" />}
                        Bloquear Equipo
                      </Button>
                    ) : (
                      <Button 
                        size="sm" 
                        className="rounded-xl font-bold bg-green-600 hover:bg-green-700 w-full sm:w-auto"
                        onClick={() => handleMdmAction('unlock')}
                        disabled={isMdmUpdating || updating}
                      >
                        {isMdmUpdating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                        Desbloquear Equipo
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sección de Foto de Entrega */}
        <Card className="border-none shadow-sm rounded-[2rem] overflow-hidden bg-white">
          <CardHeader className="p-8 border-b border-slate-50 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg font-black text-slate-900">
                <Camera className="w-6 h-6 text-primary" /> Evidencia de Entrega
              </CardTitle>
              <CardDescription className="text-xs uppercase font-black text-slate-400 tracking-widest">Foto del cliente con su nuevo celular</CardDescription>
            </div>
            {!credit.deliveryPhoto && !showCamera && (
              <Button onClick={startCamera} className="rounded-xl font-bold bg-primary hover:bg-primary/90">
                <Camera className="w-4 h-4 mr-2" /> Tomar Foto de Entrega
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-8 flex justify-center">
             {credit.deliveryPhoto ? (
               <div className="relative group max-w-xl w-full">
                 <img src={credit.deliveryPhoto} alt="Foto de Entrega" className="w-full rounded-2xl border-4 border-slate-100 shadow-xl" />
                 <Button 
                   onClick={startCamera} 
                   variant="secondary" 
                   size="sm" 
                   className="absolute bottom-4 right-4 rounded-xl font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                 >
                   <RefreshCw className="w-4 h-4 mr-2" /> Actualizar Foto
                 </Button>
               </div>
             ) : showCamera ? (
                <div className="relative w-full max-w-2xl rounded-3xl overflow-hidden border-4 border-primary/20 shadow-2xl">
                  <video ref={videoRef} autoPlay muted playsInline className="w-full aspect-video object-cover" />
                  <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-6">
                     <Button 
                      type="button" 
                      onClick={captureDeliveryPhoto} 
                      disabled={updating}
                      className="rounded-full w-20 h-20 bg-white hover:bg-slate-100 border-8 border-primary shadow-2xl flex items-center justify-center p-0"
                    >
                       <div className="w-12 h-12 rounded-full bg-primary" />
                    </Button>
                    <Button 
                      type="button" 
                      variant="secondary"
                      size="icon"
                      onClick={stopCamera}
                      className="rounded-full w-12 h-12 bg-white/20 text-white backdrop-blur-md"
                    >
                       <X className="w-6 h-6" />
                    </Button>
                  </div>
                </div>
             ) : (
                <div className="text-center py-10 space-y-4">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                    <Smartphone className="w-10 h-10" />
                  </div>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Sin foto de entrega registrada.</p>
                </div>
             )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 border-none shadow-sm rounded-[2rem] overflow-hidden bg-white">
            <CardHeader className="border-b border-slate-50 p-8">
              <CardTitle className="flex items-center gap-2 text-lg font-black">
                <CalendarDays className="w-6 h-6 text-primary" /> Cronograma de Pagos (<span className="capitalize">{credit.paymentFrequency}</span>)
              </CardTitle>
              <CardDescription className="text-xs uppercase font-black tracking-widest text-slate-400">Cuotas proyectadas</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-50">
                {schedule.map((item) => (
                  <div key={item.index} className="flex items-center justify-between p-6 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${item.isPaid ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                        {item.isPaid ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className={`font-black tracking-tight ${item.isPaid ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                          Cuota #{item.index}: {formatCurrency(item.amount)}
                        </p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          {item.date.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <Badge variant={item.isPaid ? "default" : "outline"} className={`rounded-full px-4 py-1 text-[9px] font-black tracking-widest ${item.isPaid ? 'bg-green-500' : 'text-slate-400 border-slate-200'}`}>
                      {item.isPaid ? 'PAGADO' : 'PENDIENTE'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm rounded-[2rem] overflow-hidden bg-white">
            <CardHeader className="border-b border-slate-50 p-8">
              <CardTitle className="flex items-center gap-2 text-lg font-black">
                <History className="w-6 h-6 text-primary" /> Recibos Recientes
              </CardTitle>
              <CardDescription className="text-xs uppercase font-black tracking-widest text-slate-400">Control de abonos</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loadingPayments ? (
                <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-slate-200" /></div>
              ) : payments && payments.length > 0 ? (
                <div className="divide-y divide-slate-50">
                  {payments.slice(0, 5).map((p) => (
                    <div key={p.id} className="p-6 hover:bg-slate-50/50 transition-colors">
                      <p className="font-black text-slate-900 text-lg">{formatCurrency(p.amount)}</p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                        {p.date?.toDate ? p.date.toDate().toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }) : '---'}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20">
                  <p className="text-slate-300 font-bold uppercase tracking-widest text-[9px]">Sin abonos registrados.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Contract Print View */}
      {activePrintDoc === 'contract' && (
        <div className="hidden print:block p-10 space-y-8 bg-white text-slate-900">
           <div className="flex justify-between items-center border-b-2 border-slate-900 pb-6">
              <div className="flex items-center gap-4">
                <Image src={logo?.imageUrl || '/logo.png'} alt="Logo" width={100} height={100} />
                <div>
                  <h1 className="text-3xl font-black tracking-tighter">TECNICELL CRÉDITOS</h1>
                  <p className="text-xs font-bold uppercase tracking-widest">Servicio Técnico y Accesorios</p>
                  <p className="text-xs font-black">NIT: 1003078186</p>
                </div>
              </div>
              <div className="text-right text-xs">
                 <p className="font-bold">Contrato de Crédito No.</p>
                 <p className="text-xl font-black">#{id.slice(0, 8).toUpperCase()}</p>
              </div>
           </div>

           <div className="space-y-6 text-sm leading-relaxed">
              <p className="text-justify">
                 En el municipio de <strong>SANTA FE LAS CLARAS (RIO VERDE) CORDOBA COLOMBIA</strong>, a los <strong>{contractDate}</strong>, se celebra el presente CONTRATO DE COMPRAVENTA CON RESERVA DE DOMINIO Y FINANCIACIÓN, entre el establecimiento comercial <strong>TECNICELL CRÉDITOS</strong>, representado por Deiner Fernandez, en adelante "EL VENDEDOR", y el señor(a) <strong>{customer?.name}</strong>, identificado(a) con cédula de ciudadanía No. <strong>{customer?.cedula}</strong>, domiciliado(a) en <strong>{customer?.address || 'N/A'}</strong> y contacto <strong>{customer?.phone}</strong>, en adelante "EL CLIENTE", bajo las siguientes cláusulas:
              </p>

              <div className="border-2 border-slate-200 rounded-2xl p-6 bg-slate-50 space-y-2">
                 <h3 className="font-black border-b border-slate-300 pb-2 mb-4">ESPECIFICACIONES DEL PRODUCTO Y CRÉDITO</h3>
                 <div className="grid grid-cols-2 gap-4">
                    <p><strong>Equipo:</strong> {credit.deviceModel}</p>
                    <p><strong>IMEI:</strong> {credit.imei}</p>
                    <p><strong>Precio Venta:</strong> {formatCurrency(credit.initialAmount)}</p>
                    <p><strong>Cuota Inicial:</strong> {formatCurrency(credit.downPayment)}</p>
                    <p><strong>Monto Financiado:</strong> {formatCurrency(credit.totalAmount)}</p>
                    <p><strong>No. de Cuotas:</strong> {credit.planType} <span className="capitalize">{credit.paymentFrequency}es</span></p>
                    <p className="col-span-2"><strong>Valor Cuota <span className="capitalize">{credit.paymentFrequency}</span>:</strong> {formatCurrency(credit.installmentAmount)}</p>
                 </div>
              </div>

              <div className="space-y-4">
                 <p><strong>CLÁUSULA PRIMERA. OBJETO:</strong> EL VENDEDOR entrega a EL CLIENTE el equipo celular descrito anteriormente bajo la modalidad de venta financiada.</p>
                 
                 <p><strong>CLÁUSULA SEGUNDA. RESERVA DE DOMINIO:</strong> EL VENDEDOR se reserva el dominio y propiedad del equipo celular hasta que EL CLIENTE haya cancelado la totalidad del monto financiado y sus intereses.</p>
                 
                 <div className="p-4 border-l-4 border-slate-900 bg-slate-50 font-bold italic">
                    CLÁUSULA TERCERA. INCUMPLIMIENTO Y RETIRO DEL EQUIPO: En caso de que EL CLIENTE presente una mora superior a DOS (2) MESES (60 días calendario) en el pago de cualquiera de sus cuotas, EL VENDEDOR está facultado legalmente para RECOGER Y RETIRAR el equipo celular de manos de EL CLIENTE. En este evento, EL CLIENTE perderá la totalidad de las cuotas pagadas y la cuota inicial por concepto de arrendamiento, uso y depreciación del equipo, salvo acuerdo escrito previo.
                 </div>

                 <p><strong>CLÁUSULA CUARTA. BLOQUEO REMOTO:</strong> El cliente autoriza expresamente la instalación y ejecución de software de administración remota que permitirá el BLOQUEO TOTAL del dispositivo en caso de mora superior a 1 día después de la fecha de pago.</p>

                 <div className="p-4 border-l-4 border-destructive bg-destructive/5 font-bold">
                    CLÁUSULA QUINTA. USO INADECUADO: Si el cliente hace uso inadecuado del equipo como formateos, bypass y tratar de desbloquear el equipo será tomado como una NEGATIVA AL PAGO y se procederá a recoger dicho equipo de manera inmediata.
                 </div>

                 <p><strong>CLÁUSULA SEXTA. REPORTE A CENTRALES DE RIESGO:</strong> EL CLIENTE autoriza expresamente a EL VENDEDOR para que reporte, procese y divulgue el comportamiento de pago y el incumplimiento de las obligaciones crediticias ante las centrales de información y riesgo crediticio. La mora o negativa al pago generará reportes negativos en su historial crediticio.</p>

                 <p><strong>CLÁUSULA SÉPTIMA. CUIDADO DEL BIEN:</strong> EL CLIENTE se obliga a mantener el equipo en buen estado. El mal funcionamiento, daño físico o pérdida del equipo no exonera a EL CLIENTE de su obligación de pago.</p>
              </div>

              <div className="pt-24 grid grid-cols-3 gap-10 items-end">
                 <div className="border-t-2 border-slate-900 pt-2 text-center">
                    <p className="font-black text-xs uppercase">EL CLIENTE</p>
                    <p className="text-[10px]">{customer?.name}</p>
                    <p className="text-[10px]">C.C. {customer?.cedula}</p>
                 </div>
                 <div className="flex flex-col items-center gap-1">
                    <div className="w-16 h-20 border-2 border-slate-900 rounded-md" />
                    <p className="text-[10px] font-black uppercase">Huella</p>
                 </div>
                 <div className="border-t-2 border-slate-900 pt-2 text-center">
                    <p className="font-black text-xs uppercase">EL VENDEDOR</p>
                    <p className="text-[10px]">TECNICELL CRÉDITOS</p>
                    <p className="text-[10px]">Nit. 1003078186</p>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Promissory Note Print View */}
      {activePrintDoc === 'promissory' && (
        <div className="hidden print:block p-16 space-y-12 bg-white text-slate-900 min-h-screen">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-black tracking-tighter border-b-4 border-slate-900 pb-4 inline-block px-10">LETRA DE CAMBIO</h1>
            <p className="text-sm font-bold uppercase tracking-widest pt-2">Título Valor de Obligación Incondicional</p>
          </div>

          <div className="grid grid-cols-2 gap-10 border-2 border-slate-900 p-8 rounded-3xl">
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400">Número de Título</p>
                <p className="text-2xl font-black">#{id.slice(0, 8).toUpperCase()}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400">Lugar de Expedición</p>
                <p className="font-bold">SANTA FE LAS CLARAS (RIO VERDE) CORDOBA COLOMBIA</p>
              </div>
            </div>
            <div className="text-right space-y-4">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400">Valor de la Obligación</p>
                <p className="text-4xl font-black text-primary">{formatCurrency(credit.totalAmount)}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400">Fecha de Expedición</p>
                <p className="font-bold">{contractDate}</p>
              </div>
            </div>
          </div>

          <div className="space-y-8 text-lg leading-relaxed text-justify px-4">
            <p>
              Yo, <strong>{customer?.name}</strong>, mayor de edad, identificado(a) con la cédula de ciudadanía No. <strong>{customer?.cedula}</strong>, por medio del presente documento declaro que <strong>PAGARÉ INCONDICIONALMENTE</strong>, a la orden de <strong>TECNICELL CRÉDITOS</strong> (Nit: 1003078186), o a quien represente sus derechos, la suma de:
            </p>
            
            <div className="bg-slate-50 border-2 border-slate-200 p-6 rounded-2xl text-center">
              <p className="font-black text-xl italic uppercase">
                {numeroALetras(credit.totalAmount)} ({credit.totalAmount.toLocaleString('es-CO')} PESOS M/CTE)
              </p>
            </div>

            <p>
              Dicha suma será cancelada en cuotas <span className="capitalize">{credit.paymentFrequency}es</span>, según los plazos establecidos en el contrato de financiación anexo. En caso de mora en el pago de una o más cuotas, se causarán intereses a la tasa máxima legal permitida.
            </p>

            <p className="text-base font-medium opacity-80">
              <strong>CLÁUSULA DE ACELERACIÓN:</strong> El incumplimiento en el pago de una sola de las cuotas pactadas facultará al tenedor de este título para declarar vencidos todos los plazos y exigir el pago total de la obligación por la vía ejecutiva. Renuncio al protesto y a las diligencias de aviso de rechazo.
            </p>
          </div>

          <div className="pt-32 grid grid-cols-2 gap-32 items-end px-10">
            <div className="space-y-6">
              <div className="border-t-2 border-slate-900 pt-2">
                <p className="font-black text-sm uppercase">FIRMA DEL DEUDOR</p>
                <p className="text-xs">Nombre: {customer?.name}</p>
                <p className="text-xs">C.C. {customer?.cedula}</p>
                <p className="text-xs">Dirección: {customer?.address || '____________________'}</p>
                <p className="text-xs">Tel: {customer?.phone}</p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-32 h-40 border-2 border-slate-900 rounded-xl" />
              <p className="text-[10px] font-black uppercase">HUELLA DACTILAR</p>
            </div>
          </div>

          <div className="pt-20 text-center opacity-40 border-t">
            <p className="text-[8px] font-black uppercase tracking-widest">Documento Generado por Sistema Experto Tecnicell Créditos - NIT: 1003078186</p>
          </div>
        </div>
      )}
    </div>
  );
}
