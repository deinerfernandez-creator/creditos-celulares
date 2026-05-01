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
  const { data: credit, isLoading: loadingCredit, error: creditError } = useDoc(creditRef);

  // Fetch Customer Data (dependent on credit)
  const customerRef = useMemoFirebase(() => credit?.customerId ? doc(db, 'customers', credit.customerId) : null, [db, credit?.customerId]);
  const { data: customer, isLoading: loadingCustomer } = useDoc(customerRef);

  // Fetch Payments
  const paymentsQuery = useMemoFirebase(() => {
    if (!id) return null;
    return query(collection(db, 'payments'), where('creditId', '==', id), orderBy('date', 'desc'));
  }, [db, id]);
  const { data: payments, isLoading: loadingPayments, error: paymentsError } = useCollection(paymentsQuery);

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
          description: "No se pudo registrar el pago. Revisa los permisos.",
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

  // Improved loading and error states
  if (loadingCredit || (credit && !customer && loadingCustomer)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  // If there's an error listing or getting, the FirebaseErrorListener will throw, 
  // but we shouldn't show "Not found" if it was actually a permission error.
  if (!credit && !creditError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-slate-50">
        <AlertCircle className="w-16 h-16 text-destructive/20 mb-6" />
        <h2 className="text-2xl font-black text-slate-900">Crédito no encontrado</h2>
        <Button asChild className="mt-8">
          <Link href="/">Volver al Dashboard</Link>
        </Button>
      </div>
    );
  }

  const progress = credit?.totalAmount > 0 
    ? Math.min(100, Math.max(0, ((credit.totalAmount - credit.remainingBalance) / credit.totalAmount) * 100))
    : 0;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild className="rounded-full bg-white">
              <Link href="/"><ChevronLeft className="w-5 h-5" /></Link>
            </Button>
            <div>
              <h1 className="text-3xl font-black text-slate-900">Detalle del Crédito</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={credit?.status === 'activo' ? 'default' : credit?.status === 'completado' ? 'secondary' : 'destructive'} className="rounded-full capitalize">
                  {credit?.status || '---'}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="rounded-xl bg-primary text-white shadow-lg h-11 px-6 font-bold">Registrar Pago</Button>
                </DialogTrigger>
                <DialogContent className="rounded-3xl border-none">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-black">Registrar Abono</DialogTitle>
                    <DialogDescription>Ingresa el monto en Pesos (COP) recibido.</DialogDescription>
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
                          className="pl-10 h-16 text-2xl font-black rounded-2xl bg-slate-50"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsPaymentDialogOpen(false)}>Cancelar</Button>
                    <Button onClick={handleRegisterPayment} disabled={isSubmittingPayment || !paymentAmount} className="bg-primary text-white">
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
              <Card className="border-none shadow-sm rounded-2xl">
                <CardHeader className="pb-2">
                  <CardDescription className="uppercase text-[10px] font-bold">Cliente</CardDescription>
                  <CardTitle className="text-lg font-bold">{customer?.name || 'Cargando...'}</CardTitle>
                </CardHeader>
              </Card>

              <Card className="border-none shadow-sm rounded-2xl">
                <CardHeader className="pb-2">
                  <CardDescription className="uppercase text-[10px] font-bold">Equipo</CardDescription>
                  <CardTitle className="text-lg font-bold">{credit?.deviceModel}</CardTitle>
                </CardHeader>
              </Card>

              <Card className="border-none shadow-sm border-l-4 border-green-500 rounded-2xl">
                <CardHeader className="pb-2">
                  <CardDescription className="uppercase text-[10px] font-bold">Cuota Inicial</CardDescription>
                  <CardTitle className="text-xl font-black">{formatCurrency(credit?.downPayment || 0)}</CardTitle>
                </CardHeader>
              </Card>

              <Card className="border-none shadow-sm border-l-4 border-primary rounded-2xl">
                <CardHeader className="pb-2">
                  <CardDescription className="uppercase text-[10px] font-bold">Saldo Pendiente</CardDescription>
                  <CardTitle className="text-xl font-black">{formatCurrency(credit?.remainingBalance || 0)}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  <div className="w-full bg-slate-100 rounded-full h-2.5 mt-2">
                     <div className="bg-primary h-full rounded-full" style={{ width: `${progress}%` }} />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="installments" className="w-full">
              <TabsList className="bg-slate-200/50 p-1.5 rounded-2xl h-14 w-full max-w-md">
                <TabsTrigger value="installments" className="rounded-xl flex-1 h-full">Cronograma</TabsTrigger>
                <TabsTrigger value="history" className="rounded-xl flex-1 h-full">Historial</TabsTrigger>
              </TabsList>
              
              <TabsContent value="installments" className="mt-6">
                <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 font-black text-[10px] uppercase border-b">
                        <th className="px-8 py-5">Cuota #</th>
                        <th className="px-8 py-5">Fecha Vencimiento</th>
                        <th className="px-8 py-5">Valor</th>
                        <th className="px-8 py-5 text-right">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {schedule.map((item) => (
                        <tr key={item.number}>
                          <td className="px-8 py-5 font-black text-slate-300">#{item.number}</td>
                          <td className="px-8 py-5 font-bold">
                            {isValid(item.dueDate) ? format(item.dueDate, 'PPP', { locale: es }) : '---'}
                          </td>
                          <td className="px-8 py-5 font-black">{formatCurrency(item.amount)}</td>
                          <td className="px-8 py-5 text-right">
                            {item.isPaid ? (
                              <Badge className="bg-green-100 text-green-700 border-none rounded-full px-4 py-1">Pagado</Badge>
                            ) : (
                              <Badge variant="outline" className="text-slate-400 border-slate-200 rounded-full px-4 py-1">Pendiente</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              </TabsContent>

              <TabsContent value="history" className="mt-6">
                <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden">
                  {payments && payments.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                      {payments.map((p: any) => (
                        <div key={p.id} className="p-8 flex items-center justify-between">
                          <div className="flex items-center gap-6">
                            <Receipt className="w-6 h-6 text-green-600" />
                            <div>
                              <p className="font-black text-2xl">{formatCurrency(p.amount)}</p>
                              <p className="text-xs text-slate-500">
                                {p.date?.toDate ? format(p.date.toDate(), 'PPPp', { locale: es }) : 'Procesando...'}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-[10px] font-mono opacity-50">REF: {p.id.slice(0, 8)}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-20 text-center italic text-slate-400">No hay pagos registrados.</div>
                  )}
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-8">
            <Card className="border-none shadow-2xl bg-primary text-white rounded-3xl">
               <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg font-black">
                    <BrainCircuit className="w-5 h-5 text-accent" /> Análisis IA
                  </CardTitle>
               </CardHeader>
               <CardContent>
                 {aiSummary ? (
                   <div className="text-sm bg-white/10 p-5 rounded-2xl border border-white/10">{aiSummary}</div>
                 ) : (
                   <Button onClick={handleGenerateAiSummary} disabled={loadingAi} className="w-full bg-accent text-primary font-black">
                     {loadingAi ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Generar Resumen'}
                   </Button>
                 )}
               </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}