
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  ChevronLeft, 
  User, 
  Smartphone, 
  Calendar, 
  Clock, 
  AlertCircle,
  BrainCircuit,
  DollarSign,
  History,
  Hash,
  Loader2,
  ExternalLink,
  CheckCircle2,
  Receipt
} from 'lucide-react';
import { useFirestore, useDoc, useMemoFirebase, useCollection, useUser } from '@/firebase';
import { doc, collection, query, where, orderBy, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { summarizeCreditStatus } from '@/ai/flows/ai-credit-summary-tool';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { addDays, format, isValid } from 'date-fns';
import { es } from 'date-fns/locale';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value);
};

export default function CreditDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const { toast } = useToast();
  const { user } = useUser();
  const db = useFirestore();

  const [paymentAmount, setPaymentAmount] = useState('');
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Fetch Credit Data
  const creditRef = useMemoFirebase(() => id ? doc(db, 'credits', id) : null, [db, id]);
  const { data: credit, isLoading: loadingCredit } = useDoc(creditRef);

  // Fetch Customer Data (dependent on credit)
  const customerRef = useMemoFirebase(() => credit?.customerId ? doc(db, 'customers', credit.customerId) : null, [db, credit?.customerId]);
  const { data: customer, isLoading: loadingCustomer } = useDoc(customerRef);

  // Fetch Payments
  const paymentsQuery = useMemoFirebase(() => {
    if (!id) return null;
    return query(collection(db, 'payments'), where('creditId', '==', id), orderBy('date', 'desc'));
  }, [db, id]);
  const { data: payments, isLoading: loadingPayments } = useCollection(paymentsQuery);

  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  // Generate Payment Schedule (Cronograma)
  const schedule = useMemo(() => {
    if (!credit || !credit.createdAt) return [];
    
    const items = [];
    const baseDate = credit.createdAt?.toDate ? credit.createdAt.toDate() : (credit.createdAt ? new Date(credit.createdAt) : new Date());
    
    if (!isValid(baseDate)) return [];

    const totalPaidAmount = payments?.reduce((acc, p) => acc + (p.amount || 0), 0) || 0;
    let accumulatedForComparison = 0;

    const numInstallments = credit.planType || 6;
    for (let i = 1; i <= numInstallments; i++) {
      const dueDate = addDays(baseDate, i * 14); // Fortnightly
      accumulatedForComparison += credit.installmentAmount;
      const isPaid = totalPaidAmount >= (accumulatedForComparison - 500); // Tolerance for rounding

      items.push({
        number: i,
        dueDate,
        amount: credit.installmentAmount,
        isPaid
      });
    }
    return items;
  }, [credit, payments]);

  const handleRegisterPayment = () => {
    if (!paymentAmount || isNaN(parseFloat(paymentAmount)) || !credit) return;
    
    setIsSubmittingPayment(true);
    const amount = parseFloat(paymentAmount);
    
    const paymentData = {
      creditId: id,
      amount: amount,
      date: serverTimestamp(),
      staffId: user?.uid || 'anonymous'
    };

    addDoc(collection(db, 'payments'), paymentData)
      .then(() => {
        const newBalance = Math.max(0, credit.remainingBalance - amount);
        const newStatus = newBalance <= 0 ? 'completado' : credit.status;
        
        updateDoc(doc(db, 'credits', id), {
          remainingBalance: newBalance,
          status: newStatus
        }).then(() => {
          toast({
            title: "Pago Registrado",
            description: `Se han abonado ${formatCurrency(amount)} al crédito.`,
          });
          setPaymentAmount('');
          setIsPaymentDialogOpen(false);
          setIsSubmittingPayment(false);
        });
      })
      .catch((err) => {
        toast({
          title: "Error",
          description: "No se pudo registrar el pago.",
          variant: "destructive"
        });
        setIsSubmittingPayment(false);
      });
  };

  const handleGenerateAiSummary = async () => {
    if (!credit || !customer) return;
    setLoadingAi(true);
    try {
      const firstUnpaid = schedule.find(s => !s.isPaid);
      const nextDate = firstUnpaid && isValid(firstUnpaid.dueDate) ? format(firstUnpaid.dueDate, 'yyyy-MM-dd') : 'Completado';

      const summary = await summarizeCreditStatus({
        customerName: customer.name,
        loanAmount: (credit.initialAmount || 0) - (credit.downPayment || 0),
        totalAmountDue: credit.totalAmount || 0,
        remainingBalance: credit.remainingBalance || 0,
        nextPaymentDate: nextDate,
        paymentFrequency: 'quincenal',
        paymentHistory: payments?.map(p => ({
          date: p.date?.toDate ? p.date.toDate().toISOString().split('T')[0] : 'N/A',
          amount: p.amount
        })) || []
      });
      setAiSummary(summary);
    } catch (err) {
      toast({
        title: "Error",
        description: "No se pudo generar el resumen de IA.",
        variant: "destructive"
      });
    } finally {
      setLoadingAi(false);
    }
  };

  // Improved loading logic to prevent false "Not Found" state
  const isInitialLoading = loadingCredit || (credit && !customer && loadingCustomer) || (id && !credit && loadingCredit);

  if (isInitialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
          <p className="text-sm text-slate-500 font-medium">Cargando detalles del crédito...</p>
        </div>
      </div>
    );
  }

  if (!credit) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-slate-50">
        <div className="bg-white p-12 rounded-3xl shadow-xl max-w-md w-full">
          <AlertCircle className="w-16 h-16 text-destructive/20 mx-auto mb-6" />
          <h2 className="text-2xl font-black text-slate-900">Crédito no encontrado</h2>
          <p className="text-slate-500 mt-2 mb-8">No pudimos localizar el crédito con ID: <span className="font-mono text-xs">{id}</span></p>
          <Button asChild className="w-full h-12 rounded-xl bg-primary text-white shadow-lg shadow-primary/20">
            <Link href="/">Volver al Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  const progress = credit.totalAmount > 0 
    ? Math.min(100, Math.max(0, ((credit.totalAmount - credit.remainingBalance) / credit.totalAmount) * 100))
    : 0;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild className="rounded-full bg-white border-slate-200">
              <Link href="/"><ChevronLeft className="w-5 h-5" /></Link>
            </Button>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900">Detalle del Crédito</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono text-[10px] uppercase bg-slate-200 px-2 py-0.5 rounded text-slate-600">ID: {id.slice(0, 8)}</span>
                <Badge variant={credit.status === 'activo' ? 'default' : credit.status === 'completado' ? 'secondary' : 'destructive'} className="rounded-full px-3 capitalize">
                  {credit.status}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
             {customer && (
               <Button variant="outline" asChild className="rounded-xl border-slate-200 bg-white hover:bg-slate-50">
                 <Link href={`/portal/${customer.id}`} target="_blank" className="flex items-center gap-2">
                   <Smartphone className="w-4 h-4" /> Portal Cliente <ExternalLink className="w-3 h-3" />
                 </Link>
               </Button>
             )}

             <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="rounded-xl bg-primary text-white shadow-lg shadow-primary/20 h-11 px-6 font-bold">Registrar Pago</Button>
                </DialogTrigger>
                <DialogContent className="rounded-3xl border-none shadow-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-black">Registrar Abono</DialogTitle>
                    <DialogDescription>
                      Ingresa el monto en Pesos (COP) recibido para este crédito.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount">Monto en Pesos (COP)</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-600" />
                        <Input 
                          id="amount" 
                          type="number" 
                          placeholder="0" 
                          className="pl-10 h-16 text-2xl font-black rounded-2xl bg-slate-50 border-slate-100"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                        />
                      </div>
                      <div className="flex justify-between text-xs font-medium text-slate-500 px-1">
                        <span>Saldo pendiente:</span>
                        <span className="text-primary font-bold">{formatCurrency(credit.remainingBalance)}</span>
                      </div>
                    </div>
                  </div>
                  <DialogFooter className="gap-2 sm:gap-0">
                    <Button 
                      variant="ghost" 
                      onClick={() => setIsPaymentDialogOpen(false)} 
                      className="rounded-xl h-12"
                    >
                      Cancelar
                    </Button>
                    <Button 
                      onClick={handleRegisterPayment} 
                      disabled={isSubmittingPayment || !paymentAmount}
                      className="rounded-xl bg-primary text-white h-12 px-8 font-bold"
                    >
                      {isSubmittingPayment ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirmar Pago"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
             </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="border-none shadow-sm bg-white rounded-2xl">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest text-slate-400">
                    <User className="w-3 h-3" /> Cliente
                  </CardDescription>
                  <CardTitle className="text-lg truncate font-bold text-slate-900">{customer?.name || 'Cargando...'}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  <p className="font-medium text-slate-600">CC: {customer?.cedula || '---'}</p>
                  <p className="text-xs text-primary font-bold mt-2">{customer?.phone || '---'}</p>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm bg-white rounded-2xl">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest text-slate-400">
                    <Smartphone className="w-3 h-3" /> Equipo
                  </CardDescription>
                  <CardTitle className="text-lg font-bold text-slate-900">{credit.deviceModel}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  <p className="text-[10px] font-mono text-slate-500 truncate">IMEI: {credit.imei}</p>
                  <p className="font-bold text-slate-700 mt-1">{credit.planType} Cuotas Quincenales</p>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm bg-white border-l-4 border-green-500 rounded-2xl">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2 text-green-600 font-black uppercase text-[10px] tracking-widest">
                    <DollarSign className="w-3 h-3" /> Cuota Inicial
                  </CardDescription>
                  <CardTitle className="text-xl font-black text-slate-900">{formatCurrency(credit.downPayment || 0)}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Precio Total: {formatCurrency(credit.initialAmount)}</p>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm bg-white border-l-4 border-primary rounded-2xl">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-widest">
                    <DollarSign className="w-3 h-3" /> Saldo Pendiente
                  </CardDescription>
                  <CardTitle className="text-xl font-black text-slate-900">{formatCurrency(credit.remainingBalance)}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  <div className="flex justify-between text-[10px] uppercase tracking-wider text-slate-400 mb-1.5 font-black">
                    <span>Progreso</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                     <div 
                       className="bg-primary h-full rounded-full transition-all duration-1000 ease-out" 
                       style={{ width: `${progress}%` }}
                     />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="installments" className="w-full">
              <TabsList className="bg-slate-200/50 p-1.5 rounded-2xl h-14 w-full max-w-md">
                <TabsTrigger value="installments" className="rounded-xl flex-1 h-full data-[state=active]:bg-white data-[state=active]:shadow-md font-bold text-slate-600 data-[state=active]:text-primary">
                  <Calendar className="w-4 h-4 mr-2" /> Cronograma
                </TabsTrigger>
                <TabsTrigger value="history" className="rounded-xl flex-1 h-full data-[state=active]:bg-white data-[state=active]:shadow-md font-bold text-slate-600 data-[state=active]:text-primary">
                  <History className="w-4 h-4 mr-2" /> Historial de Pagos
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="installments" className="mt-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="bg-slate-50/80 text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] border-b">
                          <th className="px-8 py-5">Cuota #</th>
                          <th className="px-8 py-5">Fecha Vencimiento</th>
                          <th className="px-8 py-5">Valor Cuota</th>
                          <th className="px-8 py-5 text-right">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {schedule.map((item) => (
                          <tr key={item.number} className="group hover:bg-slate-50/50 transition-colors">
                            <td className="px-8 py-5 font-black text-slate-300 group-hover:text-primary transition-colors">#{item.number}</td>
                            <td className="px-8 py-5 font-bold text-slate-700">
                              {isValid(item.dueDate) ? format(item.dueDate, 'PPP', { locale: es }) : '---'}
                            </td>
                            <td className="px-8 py-5 font-black text-slate-900">{formatCurrency(item.amount)}</td>
                            <td className="px-8 py-5 text-right">
                              {item.isPaid ? (
                                <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none rounded-full px-4 py-1 font-black text-[10px] uppercase tracking-wider inline-flex items-center gap-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Pagado
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-slate-400 border-slate-200 rounded-full px-4 py-1 font-bold text-[10px] uppercase tracking-wider inline-flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5" /> Pendiente
                                </Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="history" className="mt-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden">
                  {payments && payments.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                      {payments.map((p: any) => (
                        <div key={p.id} className="p-8 flex items-center justify-between hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-6">
                            <div className="p-4 bg-green-50 text-green-600 rounded-2xl shadow-sm">
                              <Receipt className="w-6 h-6" />
                            </div>
                            <div>
                              <p className="font-black text-2xl text-slate-900">{formatCurrency(p.amount)}</p>
                              <p className="text-xs text-slate-500 font-medium mt-1">
                                {p.date?.toDate ? format(p.date.toDate(), 'PPPp', { locale: es }) : 'Procesando...'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline" className="text-[10px] font-mono uppercase text-slate-400 border-slate-100 bg-slate-50 rounded-lg px-2 py-1">
                              REF: {p.id.slice(0, 8)}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-20 text-center">
                       <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                          <History className="w-10 h-10" />
                       </div>
                       <p className="text-slate-400 font-bold italic">No hay pagos registrados para este crédito.</p>
                    </div>
                  )}
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-8">
            <Card className="border-none shadow-2xl bg-gradient-to-br from-primary to-primary/80 text-white overflow-hidden relative rounded-3xl">
               <div className="absolute top-0 right-0 p-4 opacity-10">
                  <BrainCircuit className="w-24 h-24" />
               </div>
               <CardHeader className="relative z-10 pb-0">
                  <CardTitle className="flex items-center gap-2 text-lg font-black">
                    <BrainCircuit className="w-5 h-5 text-accent" />
                    Análisis IA
                  </CardTitle>
                  <CardDescription className="text-white/60 font-medium">Estado de cuenta inteligente</CardDescription>
               </CardHeader>
               <CardContent className="relative z-10 pt-6">
                 {aiSummary ? (
                   <div className="text-sm leading-relaxed bg-white/10 p-5 rounded-2xl backdrop-blur-md border border-white/10 animate-in zoom-in duration-500 font-medium">
                     {aiSummary}
                   </div>
                 ) : (
                   <div className="text-center py-8 space-y-6">
                      <p className="text-sm text-white/70 leading-relaxed">Obtén una visión rápida del comportamiento de este cliente procesada por IA.</p>
                      <Button 
                        onClick={handleGenerateAiSummary} 
                        disabled={loadingAi}
                        className="w-full bg-accent hover:bg-accent/90 text-primary font-black h-12 rounded-2xl shadow-xl shadow-black/10 transition-transform active:scale-95"
                      >
                        {loadingAi ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Generar Resumen'}
                      </Button>
                   </div>
                 )}
               </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden">
              <CardHeader className="pb-3 border-b border-slate-50">
                <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-slate-400">
                  <AlertCircle className="w-4 h-4 text-orange-400" /> Notificaciones
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100/50 flex gap-4">
                   <Clock className="w-5 h-5 text-orange-500 shrink-0" />
                   <div>
                     <p className="text-xs text-orange-800 font-bold leading-relaxed">Recuerda que los cobros son obligatoriamente quincenales.</p>
                   </div>
                </div>
                {credit.status === 'atrasado' && (
                  <div className="p-4 bg-red-50 rounded-2xl border border-red-100/50 flex gap-4">
                     <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                     <div>
                       <p className="text-xs text-red-800 font-bold leading-relaxed">¡Alerta de Mora! El cliente presenta un retraso crítico.</p>
                     </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
