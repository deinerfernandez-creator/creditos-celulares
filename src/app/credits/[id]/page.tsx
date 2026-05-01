
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
  Fingerprint,
  Phone,
  Settings2,
  CheckCircle2,
  History,
  TrendingUp,
  Receipt,
  Trash2,
  CalendarDays,
  Clock
} from 'lucide-react';
import { 
  useFirestore, 
  useDoc, 
  useCollection, 
  useMemoFirebase,
  deleteDocumentNonBlocking
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

  const [mounted, setMounted] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [openPayment, setOpenPayment] = useState(false);

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
      
      if (newBalance === 0) {
        updateData.status = 'pagado';
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
    if (!id || !db) return;
    deleteDocumentNonBlocking(doc(db, 'credits', id));
    toast({ title: "Expediente Eliminado", description: "El crédito ha sido removido satisfactoriamente." });
    router.push('/');
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

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-body">
      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
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
                <Fingerprint className="w-5 h-5" /> Perfil del Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Nombre Completo</p>
                <p className="font-black text-xl text-slate-900">{customer?.name || '---'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
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
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 bg-slate-50 rounded-[1.5rem] border border-slate-100">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Saldo Actual</p>
                  <p className="text-2xl font-black text-slate-900">{formatCurrency(credit.remainingBalance)}</p>
                </div>
                <div className="p-5 bg-primary/5 rounded-[1.5rem] border border-primary/10 text-right">
                  <div className="flex items-center justify-end gap-2 mb-1">
                    <TrendingUp className="w-3 h-3 text-primary" />
                    <p className="text-[10px] font-black uppercase text-primary tracking-widest">Progreso</p>
                  </div>
                  <p className="text-2xl font-black text-primary">{Math.round(progress)}%</p>
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
    </div>
  );
}
