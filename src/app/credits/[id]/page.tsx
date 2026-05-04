
"use client";

import React, { useState, useEffect, useMemo } from 'react';
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
  FileText
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const formatCurrency = (value: any) => {
  const num = Number(value);
  if (isNaN(num)) return '$ 0';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(num);
};

export default function CreditDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const db = useFirestore();
  const { toast } = useToast();
  const { role } = useUser();

  const [mounted, setMounted] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [openPayment, setOpenPayment] = useState(false);
  const [openContract, setOpenContract] = useState(false);

  const logo = PlaceHolderImages.find(img => img.id === 'logo-tecnicell');

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
    
    const items = [];
    for (let i = 1; i <= credit.planType; i++) {
      const dueDate = new Date(startDate);
      dueDate.setDate(dueDate.getDate() + (i * 15));
      
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
      
      if (newBalance <= 100) { // Tolerancia por redondeo
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

  const handleDeleteCredit = () => {
    if (role !== 'admin') return;
    if (!id || !db) return;
    deleteDocumentNonBlocking(doc(db, 'credits', id));
    toast({ title: "Expediente Eliminado", description: "El crédito ha sido removido satisfactoriamente." });
    router.push('/');
  };

  const handlePrintContract = () => {
    window.print();
  };

  const progress = useMemo(() => {
    if (!credit?.totalAmount || !credit?.remainingBalance) return 0;
    const paid = credit.totalAmount - credit.remainingBalance;
    return Math.min(100, Math.max(0, (paid / credit.totalAmount) * 100));
  }, [credit]);

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
        <Button asChild className="mt-8 rounded-xl"><Link href="/">Volver</Link></Button>
      </div>
    );
  }

  const contractDate = credit.createdAt?.toDate ? credit.createdAt.toDate().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('es-CO');

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-body print:p-0 print:bg-white">
      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild className="rounded-xl bg-white shadow-sm">
              <Link href="/"><ChevronLeft className="w-5 h-5" /></Link>
            </Button>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Expediente Financiero</h1>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Crédito #{id.slice(0, 8)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
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
                     </div>
                  </div>
                  
                  <section className="space-y-4">
                    <p>En la ciudad de Rio Verde, a los <strong>{contractDate}</strong>, se celebra el presente contrato entre <strong>TECNICELL CRÉDITOS</strong> (El Acreedor) y <strong>{customer?.name}</strong> identificado con cédula <strong>{customer?.cedula}</strong> (El Cliente).</p>
                    
                    <div className="p-4 bg-slate-50 rounded-xl space-y-2">
                       <p className="font-black text-slate-900 border-b pb-1">DATOS DEL EQUIPO Y CRÉDITO</p>
                       <p><strong>Equipo:</strong> {credit.deviceModel}</p>
                       <p><strong>IMEI:</strong> {credit.imei}</p>
                       <p><strong>Precio Total:</strong> {formatCurrency(credit.initialAmount)}</p>
                       <p><strong>Cuota Inicial:</strong> {formatCurrency(credit.downPayment)}</p>
                       <p><strong>Saldo a Financiar:</strong> {formatCurrency(credit.totalAmount)} (Incluye Recargos)</p>
                       <p><strong>Plan:</strong> {credit.planType} Cuotas Quincenales de {formatCurrency(credit.installmentAmount)}</p>
                    </div>

                    <div className="space-y-4">
                       <p><strong>CLÁUSULA PRIMERA - RESERVA DE DOMINIO:</strong> El equipo celular descrito anteriormente seguirá siendo propiedad de TECNICELL CRÉDITOS hasta que el saldo total sea cancelado en su totalidad.</p>
                       
                       <p className="bg-primary/5 p-4 rounded-xl border border-primary/10">
                         <strong>CLÁUSULA SEGUNDA - INCUMPLIMIENTO Y MORA:</strong> El CLIENTE se compromete a realizar los pagos quincenales según el cronograma acordado. 
                         <strong className="text-primary block mt-2">Si el CLIENTE dejare de abonar cualquier cuota por un periodo superior a DOS (2) MESES calendario, TECNICELL CRÉDITOS procederá a RECOGER EL EQUIPO CELULAR.</strong>
                         En este caso, el CLIENTE perderá la totalidad de los abonos y la cuota inicial realizados hasta la fecha, por concepto de arrendamiento y depreciación del equipo, a menos que exista un acuerdo previo por escrito.
                       </p>

                       <p><strong>CLÁUSULA TERCERA - BLOQUEO REMOTO:</strong> El cliente acepta que el equipo cuenta con sistemas de administración remota que serán activados en caso de mora superior a 1 día después de la fecha de pago, impidiendo el uso total del dispositivo hasta su puesta al día.</p>
                    </div>
                  </section>

                  <div className="pt-20 grid grid-cols-2 gap-20">
                     <div className="border-t border-slate-900 pt-2 text-center">
                        <p className="font-black text-[10px] uppercase">Firma del Cliente</p>
                        <p className="text-[10px]">{customer?.name}</p>
                     </div>
                     <div className="border-t border-slate-900 pt-2 text-center">
                        <p className="font-black text-[10px] uppercase">Tecnicell Créditos</p>
                        <p className="text-[10px]">Nit. 1003078186</p>
                     </div>
                  </div>
                </div>
                <DialogFooter className="print:hidden">
                  <Button variant="outline" onClick={() => setOpenContract(false)} className="rounded-xl">Cerrar</Button>
                  <Button onClick={handlePrintContract} className="rounded-xl bg-primary">
                    <Printer className="w-4 h-4 mr-2" /> Imprimir Contrato
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
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 border-none shadow-sm rounded-[2rem] overflow-hidden bg-white">
            <CardHeader className="border-b border-slate-50 p-8">
              <CardTitle className="flex items-center gap-2 text-lg font-black">
                <CalendarDays className="w-6 h-6 text-primary" /> Cronograma de Pagos
              </CardTitle>
              <CardDescription className="text-xs uppercase font-black tracking-widest text-slate-400">Cuotas quincenales proyectadas</CardDescription>
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
      <div className="hidden print:block p-10 space-y-8 bg-white text-slate-900">
         <div className="flex justify-between items-center border-b-2 border-slate-900 pb-6">
            <div className="flex items-center gap-4">
              <Image src={logo?.imageUrl || '/logo.png'} alt="Logo" width={100} height={100} />
              <div>
                <h1 className="text-3xl font-black tracking-tighter">TECNICELL CRÉDITOS</h1>
                <p className="text-xs font-bold uppercase tracking-widest">Servicio Técnico y Accesorios</p>
              </div>
            </div>
            <div className="text-right text-xs">
               <p className="font-bold">Contrato de Crédito No.</p>
               <p className="text-xl font-black">#{id.slice(0, 8).toUpperCase()}</p>
            </div>
         </div>

         <div className="space-y-6 text-sm leading-relaxed">
            <p className="text-justify">
               En la ciudad de Rio Verde, a los <strong>{contractDate}</strong>, se celebra el presente CONTRATO DE COMPRAVENTA CON RESERVA DE DOMINIO Y FINANCIACIÓN, entre el establecimiento comercial <strong>TECNICELL CRÉDITOS</strong>, representado por Deiner Fernandez, en adelante "EL VENDEDOR", y el señor(a) <strong>{customer?.name}</strong>, identificado(a) con cédula de ciudadanía No. <strong>{customer?.cedula}</strong>, domiciliado(a) en <strong>{customer?.address || 'N/A'}</strong> y contacto <strong>{customer?.phone}</strong>, en adelante "EL CLIENTE", bajo las siguientes cláusulas:
            </p>

            <div className="border-2 border-slate-200 rounded-2xl p-6 bg-slate-50 space-y-2">
               <h3 className="font-black border-b border-slate-300 pb-2 mb-4">ESPECIFICACIONES DEL PRODUCTO Y CRÉDITO</h3>
               <div className="grid grid-cols-2 gap-4">
                  <p><strong>Equipo:</strong> {credit.deviceModel}</p>
                  <p><strong>IMEI:</strong> {credit.imei}</p>
                  <p><strong>Precio Venta:</strong> {formatCurrency(credit.initialAmount)}</p>
                  <p><strong>Cuota Inicial:</strong> {formatCurrency(credit.downPayment)}</p>
                  <p><strong>Monto Financiado:</strong> {formatCurrency(credit.totalAmount)}</p>
                  <p><strong>No. de Cuotas:</strong> {credit.planType} Quincenas</p>
                  <p className="col-span-2"><strong>Valor Cuota Quincenal:</strong> {formatCurrency(credit.installmentAmount)}</p>
               </div>
            </div>

            <div className="space-y-4">
               <p><strong>CLÁUSULA PRIMERA. OBJETO:</strong> EL VENDEDOR entrega a EL CLIENTE el equipo celular descrito anteriormente bajo la modalidad de venta financiada.</p>
               
               <p><strong>CLÁUSULA SEGUNDA. RESERVA DE DOMINIO:</strong> EL VENDEDOR se reserva el dominio y propiedad del equipo celular hasta que EL CLIENTE haya cancelado la totalidad del monto financiado y sus intereses.</p>
               
               <div className="p-4 border-l-4 border-slate-900 bg-slate-50 font-bold italic">
                  CLÁUSULA TERCERA. INCUMPLIMIENTO Y RETIRO DEL EQUIPO: En caso de que EL CLIENTE presente una mora superior a DOS (2) MESES (60 días calendario) en el pago de cualquiera de sus cuotas, EL VENDEDOR está facultado legalmente para RECOGER Y RETIRAR el equipo celular de manos de EL CLIENTE. En este evento, EL CLIENTE perderá la totalidad de las cuotas pagadas y la cuota inicial por concepto de arrendamiento, uso y depreciación del equipo, salvo acuerdo escrito previo.
               </div>

               <p><strong>CLÁUSULA CUARTA. BLOQUEO REMOTO:</strong> El cliente autoriza expresamente la instalación y ejecución de software de administración remota que permitirá el BLOQUEO TOTAL del dispositivo en caso de mora superior a 1 día después de la fecha de pago.</p>

               <p><strong>CLÁUSULA QUINTA. CUIDADO DEL BIEN:</strong> EL CLIENTE se obliga a mantener el equipo en buen estado. El mal funcionamiento, daño físico o pérdida del equipo no exonera a EL CLIENTE de su obligación de pago.</p>
            </div>

            <div className="pt-24 grid grid-cols-2 gap-32">
               <div className="border-t-2 border-slate-900 pt-2 text-center">
                  <p className="font-black text-xs uppercase">EL CLIENTE</p>
                  <p className="text-[10px]">{customer?.name}</p>
                  <p className="text-[10px]">C.C. {customer?.cedula}</p>
               </div>
               <div className="border-t-2 border-slate-900 pt-2 text-center">
                  <p className="font-black text-xs uppercase">EL VENDEDOR</p>
                  <p className="text-[10px]">TECNICELL CRÉDITOS</p>
                  <p className="text-[10px]">Nit. 1003078186</p>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
