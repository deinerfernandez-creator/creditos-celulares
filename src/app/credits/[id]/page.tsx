
"use client";

import React, { useState, useMemo } from 'react';
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
  const { id } = useParams();
  const { toast } = useToast();
  const { user } = useUser();
  const db = useFirestore();

  const [paymentAmount, setPaymentAmount] = useState('');
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Fetch real data with proper memoization
  const creditRef = useMemoFirebase(() => id ? doc(db, 'credits', id as string) : null, [db, id]);
  const { data: credit, isLoading: loadingCredit } = useDoc(creditRef);

  const customerRef = useMemoFirebase(() => credit?.customerId ? doc(db, 'customers', credit.customerId) : null, [db, credit?.customerId]);
  const { data: customer, isLoading: loadingCustomer } = useDoc(customerRef);

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
    const baseDate = credit.createdAt.toDate ? credit.createdAt.toDate() : new Date(credit.createdAt);
    
    if (!isValid(baseDate)) return [];

    const totalPaymentsAmount = payments?.reduce((acc, p) => acc + (p.amount || 0), 0) || (credit.totalAmount - credit.remainingBalance);
    let accumulatedForComparison = 0;

    for (let i = 1; i <= (credit.planType || 6); i++) {
      const dueDate = addDays(baseDate, i * 14); // Fortnightly
      accumulatedForComparison += credit.installmentAmount;
      const isPaid = totalPaymentsAmount >= (accumulatedForComparison - 100); // Tolerance for rounding

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
    if (!paymentAmount || isNaN(parseFloat(paymentAmount))) return;
    
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
        const newBalance = Math.max(0, credit!.remainingBalance - amount);
        const newStatus = newBalance <= 0 ? 'completado' : credit!.status;
        
        updateDoc(doc(db, 'credits', id as string), {
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
      const nextDate = firstUnpaid && isValid(firstUnpaid.dueDate) ? firstUnpaid.dueDate.toISOString() : 'N/A';

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

  if (loadingCredit || loadingCustomer || loadingPayments) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!credit || !customer) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <h2 className="text-2xl font-bold">Crédito no encontrado</h2>
        <Button asChild className="mt-4"><Link href="/">Volver al Dashboard</Link></Button>
      </div>
    );
  }

  const total = credit.totalAmount || 1; // Avoid division by zero
  const progress = Math.min(100, Math.max(0, ((total - credit.remainingBalance) / total) * 100));

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild className="rounded-full bg-white">
              <Link href="/"><ChevronLeft className="w-5 h-5" /></Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Detalle del Crédito</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono text-xs uppercase bg-slate-200 px-2 py-1 rounded">{id}</span>
                <Badge variant={credit.status === 'activo' ? 'default' : credit.status === 'completado' ? 'secondary' : 'destructive'}>
                  {credit.status}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <Button variant="outline" asChild className="rounded-xl border-slate-200 bg-white">
               <Link href={`/portal/${customer.id}`} target="_blank" className="flex items-center gap-2">
                 <Smartphone className="w-4 h-4" /> Ver Portal del Cliente <ExternalLink className="w-3 h-3" />
               </Link>
             </Button>

             <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="rounded-xl bg-primary text-white shadow-lg shadow-primary/20">Registrar Pago</Button>
                </DialogTrigger>
                <DialogContent className="rounded-3xl">
                  <DialogHeader>
                    <DialogTitle>Registrar Abono</DialogTitle>
                    <DialogDescription>
                      Ingresa el monto recibido del cliente para este crédito.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount">Monto en Pesos (COP)</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-600" />
                        <Input 
                          id="amount" 
                          type="number" 
                          placeholder="0" 
                          className="pl-10 h-14 text-xl font-bold rounded-2xl"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">Saldo pendiente actual: {formatCurrency(credit.remainingBalance)}</p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsPaymentDialogOpen(false)} 
                      className="rounded-xl"
                    >
                      Cancelar
                    </Button>
                    <Button 
                      onClick={handleRegisterPayment} 
                      disabled={isSubmittingPayment || !paymentAmount}
                      className="rounded-xl bg-primary text-white"
                    >
                      {isSubmittingPayment ? "Registrando..." : "Confirmar Pago"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
             </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="border-none shadow-sm bg-white">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <User className="w-3 h-3" /> Cliente
                  </CardDescription>
                  <CardTitle className="text-lg truncate">{customer.name}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  <p className="font-medium">Cédula: {customer.cedula}</p>
                  <p className="text-xs text-muted-foreground mt-2">{customer.phone}</p>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm bg-white">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <Smartphone className="w-3 h-3" /> Equipo
                  </CardDescription>
                  <CardTitle className="text-lg">{credit.deviceModel}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  <p className="text-[10px] font-mono text-muted-foreground truncate">IMEI: {credit.imei}</p>
                  <p className="font-medium mt-1">{credit.planType} Quincenas</p>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm bg-white border-l-4 border-green-500">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2 text-green-600 font-bold">
                    <DollarSign className="w-3 h-3" /> Cuota Inicial
                  </CardDescription>
                  <CardTitle className="text-xl font-black">{formatCurrency(credit.downPayment || 0)}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Precio equipo: {formatCurrency(credit.initialAmount)}</p>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm bg-white border-l-4 border-primary">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2 text-primary font-bold">
                    <DollarSign className="w-3 h-3" /> Saldo Pendiente
                  </CardDescription>
                  <CardTitle className="text-xl font-black">{formatCurrency(credit.remainingBalance)}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-bold">
                    <span>Progreso</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                     <div 
                       className="bg-primary h-2 rounded-full transition-all duration-500" 
                       style={{ width: `${progress}%` }}
                     />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="installments" className="w-full">
              <TabsList className="bg-slate-100 p-1 rounded-xl h-12 w-full max-w-md">
                <TabsTrigger value="installments" className="rounded-lg flex-1 h-full data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <Calendar className="w-4 h-4 mr-2" /> Cronograma
                </TabsTrigger>
                <TabsTrigger value="history" className="rounded-lg flex-1 h-full data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <History className="w-4 h-4 mr-2" /> Historial de Pagos
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="installments" className="mt-6">
                <Card className="border-none shadow-sm bg-white overflow-hidden">
                  <div className="p-0 overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-muted-foreground font-medium text-xs uppercase tracking-wider">
                          <th className="px-6 py-4">Cuota #</th>
                          <th className="px-6 py-4">Fecha Vencimiento</th>
                          <th className="px-6 py-4">Valor Cuota</th>
                          <th className="px-6 py-4">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {schedule.map((item) => (
                          <tr key={item.number} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 font-bold text-slate-400">#{item.number}</td>
                            <td className="px-6 py-4 font-medium">
                              {isValid(item.dueDate) ? format(item.dueDate, 'PP', { locale: es }) : 'Pendiente'}
                            </td>
                            <td className="px-6 py-4 font-bold">{formatCurrency(item.amount)}</td>
                            <td className="px-6 py-4">
                              {item.isPaid ? (
                                <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none rounded-full flex items-center gap-1 w-fit">
                                  <CheckCircle2 className="w-3 h-3" /> Pagado
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-slate-400 border-slate-200 rounded-full flex items-center gap-1 w-fit">
                                  <Clock className="w-3 h-3" /> Pendiente
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

              <TabsContent value="history" className="mt-6">
                <Card className="border-none shadow-sm bg-white">
                  {payments && payments.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                      {payments.map((p: any) => (
                        <div key={p.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-green-50 text-green-600 rounded-2xl">
                              <Receipt className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-bold text-lg">{formatCurrency(p.amount)}</p>
                              <p className="text-xs text-muted-foreground">
                                {p.date?.toDate ? format(p.date.toDate(), 'PPPp', { locale: es }) : 'Procesando...'}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-[10px] font-mono uppercase text-muted-foreground border-slate-200">
                            Ref: {p.id.slice(0, 8)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-12 text-center text-muted-foreground italic">
                       No hay pagos registrados aún.
                    </div>
                  )}
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-8">
            <Card className="border-none shadow-xl bg-gradient-to-br from-primary to-primary/80 text-white overflow-hidden relative">
               <div className="absolute top-0 right-0 p-4 opacity-10">
                  <BrainCircuit className="w-24 h-24" />
               </div>
               <CardHeader className="relative z-10 pb-0">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BrainCircuit className="w-5 h-5 text-accent" />
                    Análisis IA
                  </CardTitle>
                  <CardDescription className="text-white/60">Estado de cuenta inteligente</CardDescription>
               </CardHeader>
               <CardContent className="relative z-10 pt-6">
                 {aiSummary ? (
                   <div className="text-sm leading-relaxed bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/10 animate-in zoom-in duration-300">
                     {aiSummary}
                   </div>
                 ) : (
                   <div className="text-center py-6 space-y-4">
                      <p className="text-sm text-white/70">Obtén una visión rápida del comportamiento de este cliente.</p>
                      <Button 
                        onClick={handleGenerateAiSummary} 
                        disabled={loadingAi}
                        className="w-full bg-accent hover:bg-accent/90 text-primary font-bold rounded-xl shadow-lg shadow-black/20"
                      >
                        {loadingAi ? 'Analizando...' : 'Generar Resumen'}
                      </Button>
                   </div>
                 )}
               </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-white">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-orange-500" /> Notificaciones
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-orange-50 rounded-xl border border-orange-100 flex gap-3">
                   <Clock className="w-4 h-4 text-orange-500 shrink-0" />
                   <p className="text-xs text-orange-700">Recuerda que los pagos son quincenales.</p>
                </div>
                {credit.status === 'atrasado' && (
                  <div className="p-3 bg-red-50 rounded-xl border border-red-100 flex gap-3">
                     <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                     <p className="text-xs text-red-700">El cliente presenta un retraso en sus cuotas.</p>
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
