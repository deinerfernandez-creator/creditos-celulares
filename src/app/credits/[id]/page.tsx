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
  DollarSign,
  Loader2,
  Receipt,
  Smartphone,
  Calendar,
  BrainCircuit,
  AlertCircle
} from 'lucide-react';
import { useFirestore, useDoc, useMemoFirebase, useCollection, useUser } from '@/firebase';
import { doc, collection, query, where, orderBy, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { summarizeCreditStatus } from '@/ai/flows/ai-credit-summary-tool';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { addDays, format, isValid } from 'date-fns';
import { es } from 'date-fns/locale';

const formatCurrency = (value: number) => {
  if (isNaN(value)) return '$ 0';
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

  // Fetch Customer Data
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

  // Lógica segura para el progreso
  const progress = useMemo(() => {
    if (!credit || !credit.totalAmount || credit.totalAmount <= 0) return 0;
    const paid = (credit.totalAmount || 0) - (credit.remainingBalance || 0);
    return Math.min(100, Math.max(0, (paid / credit.totalAmount) * 100));
  }, [credit]);

  // Cronograma Seguro
  const schedule = useMemo(() => {
    if (!credit || !credit.installmentAmount) return [];
    
    let baseDate: Date;
    if (credit.createdAt?.toDate) {
      baseDate = credit.createdAt.toDate();
    } else if (credit.createdAt) {
      baseDate = new Date(credit.createdAt);
    } else {
      baseDate = new Date();
    }

    if (!isValid(baseDate)) baseDate = new Date();

    const items = [];
    const totalPaidAmount = payments?.reduce((acc, p) => acc + (p.amount || 0), 0) || 0;
    let accumulatedForComparison = 0;

    const numInstallments = credit.planType || 6;
    for (let i = 1; i <= numInstallments; i++) {
      const dueDate = addDays(baseDate, i * 14);
      accumulatedForComparison += (credit.installmentAmount || 0);
      const isPaid = totalPaidAmount >= (accumulatedForComparison - 500);

      items.push({
        number: i,
        dueDate,
        amount: credit.installmentAmount || 0,
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
        const currentBalance = credit.remainingBalance || 0;
        const newBalance = Math.max(0, currentBalance - amount);
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
          date: p.date?.toDate ? p.date.toDate().toISOString().split('T')[0] : 'Hoy',
          amount: p.amount || 0
        })) || []
      });
      setAiSummary(summary);
    } catch (err) {
      toast({
        title: "Análisis IA",
        description: "No se pudo procesar el resumen en este momento.",
        variant: "destructive"
      });
    } finally {
      setLoadingAi(false);
    }
  };

  if (loadingCredit || loadingPayments || (credit && !customer && loadingCustomer)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
        <p className="text-slate-500 font-medium">Sincronizando información...</p>
      </div>
    );
  }

  if (!credit && !loadingCredit) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-slate-50">
        <AlertCircle className="w-16 h-16 text-destructive/20 mb-6" />
        <h2 className="text-2xl font-black text-slate-900">Crédito no disponible</h2>
        <p className="text-slate-500 mt-2">No se encontró el registro o los permisos han expirado.</p>
        <Button asChild className="mt-8 rounded-xl px-8">
          <Link href="/">Volver al Dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 pb-20">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild className="rounded-full bg-white shadow-sm border-none">
              <Link href="/"><ChevronLeft className="w-5 h-5" /></Link>
            </Button>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Detalle del Crédito</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge className="rounded-full capitalize px-3">
                  {credit?.status || 'activo'}
                </Badge>
                <span className="text-xs text-slate-400 font-mono">ID: {id.slice(0, 8)}</span>
              </div>
            </div>
          </div>
          
          <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-2xl bg-primary text-white shadow-xl h-12 px-8 font-bold">
                <DollarSign className="w-5 h-5 mr-2" /> Registrar Pago
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-3xl border-none p-8">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black">Registrar Abono</DialogTitle>
                <DialogDescription>Ingresa el monto recibido en COP.</DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-6">
                <div className="space-y-3">
                  <Label className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Monto a abonar</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-green-600" />
                    <Input 
                      type="number" 
                      placeholder="0" 
                      className="pl-12 h-20 text-3xl font-black rounded-2xl bg-slate-50 border-none"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsPaymentDialogOpen(false)} className="rounded-xl">Cancelar</Button>
                <Button onClick={handleRegisterPayment} disabled={isSubmittingPayment || !paymentAmount} className="bg-primary text-white rounded-xl h-12 px-8">
                  {isSubmittingPayment ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirmar Abono"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
                <CardHeader className="pb-2">
                  <CardDescription className="uppercase text-[10px] font-black tracking-widest text-slate-400">Cliente</CardDescription>
                  <CardTitle className="text-lg font-bold truncate">{customer?.name || 'Sincronizando...'}</CardTitle>
                </CardHeader>
              </Card>

              <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
                <CardHeader className="pb-2">
                  <CardDescription className="uppercase text-[10px] font-black tracking-widest text-slate-400">Equipo</CardDescription>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-primary" /> {credit?.deviceModel || 'N/A'}
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card className="border-none shadow-sm border-l-4 border-green-500 rounded-3xl overflow-hidden bg-white">
                <CardHeader className="pb-2">
                  <CardDescription className="uppercase text-[10px] font-black tracking-widest text-slate-400">Cuota Inicial</CardDescription>
                  <CardTitle className="text-xl font-black text-green-600">{formatCurrency(credit?.downPayment || 0)}</CardTitle>
                </CardHeader>
              </Card>

              <Card className="border-none shadow-sm border-l-4 border-primary rounded-3xl overflow-hidden bg-white">
                <CardHeader className="pb-2">
                  <CardDescription className="uppercase text-[10px] font-black tracking-widest text-slate-400">Saldo Pendiente</CardDescription>
                  <CardTitle className="text-xl font-black text-primary">{formatCurrency(credit?.remainingBalance || 0)}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                     <div className="bg-primary h-full rounded-full transition-all duration-1000" style={{ width: `${progress}%` }} />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="installments" className="w-full">
              <TabsList className="bg-white border p-1.5 rounded-2xl h-14 w-full max-w-md shadow-sm">
                <TabsTrigger value="installments" className="rounded-xl flex-1 h-full data-[state=active]:bg-slate-50 data-[state=active]:shadow-sm">Cronograma</TabsTrigger>
                <TabsTrigger value="history" className="rounded-xl flex-1 h-full data-[state=active]:bg-slate-50 data-[state=active]:shadow-sm">Pagos</TabsTrigger>
              </TabsList>
              
              <TabsContent value="installments" className="mt-6">
                <Card className="border-none shadow-sm bg-white rounded-[32px] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="bg-slate-50/50 text-slate-400 font-black text-[10px] uppercase tracking-widest border-b">
                          <th className="px-8 py-6">Cuota #</th>
                          <th className="px-8 py-6">Vencimiento</th>
                          <th className="px-8 py-6">Valor</th>
                          <th className="px-8 py-6 text-right">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {schedule.map((item) => (
                          <tr key={item.number} className="group hover:bg-slate-50/30">
                            <td className="px-8 py-6 font-black text-slate-300">#{item.number}</td>
                            <td className="px-8 py-6 font-bold text-slate-700">
                              {isValid(item.dueDate) ? format(item.dueDate, 'PPP', { locale: es }) : 'Pendiente'}
                            </td>
                            <td className="px-8 py-6 font-black text-slate-900">{formatCurrency(item.amount)}</td>
                            <td className="px-8 py-6 text-right">
                              {item.isPaid ? (
                                <Badge className="bg-green-100 text-green-700 border-none rounded-full px-5 py-1 font-bold">PAGADA</Badge>
                              ) : (
                                <Badge variant="outline" className="text-slate-400 border-slate-200 rounded-full px-5 py-1 font-medium">PENDIENTE</Badge>
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
                <Card className="border-none shadow-sm bg-white rounded-[32px] overflow-hidden">
                  {payments && payments.length > 0 ? (
                    <div className="divide-y divide-slate-50">
                      {payments.map((p: any) => (
                        <div key={p.id} className="p-8 flex items-center justify-between hover:bg-slate-50/50">
                          <div className="flex items-center gap-6">
                            <div className="p-4 bg-green-50 text-green-600 rounded-2xl">
                              <Receipt className="w-6 h-6" />
                            </div>
                            <div>
                              <p className="font-black text-2xl text-slate-900">{formatCurrency(p.amount || 0)}</p>
                              <p className="text-xs text-slate-400 font-medium flex items-center gap-2 mt-1">
                                <Calendar className="w-3 h-3" />
                                {p.date?.toDate ? format(p.date.toDate(), 'PPPp', { locale: es }) : 'Registrado ahora'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline" className="text-[10px] font-mono bg-slate-50 border-none text-slate-400 px-3">
                              REF: {p.id.slice(0, 8).toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-24 text-center">
                      <Receipt className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                      <p className="italic text-slate-400 font-medium">No hay abonos registrados todavía.</p>
                    </div>
                  )}
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-8">
            <Card className="border-none shadow-xl bg-primary text-white rounded-[32px] overflow-hidden">
               <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg font-black">
                    <BrainCircuit className="w-5 h-5 text-accent" /> Análisis IA
                  </CardTitle>
               </CardHeader>
               <CardContent className="space-y-6">
                 {aiSummary ? (
                   <div className="text-sm bg-white/10 backdrop-blur-md p-6 rounded-[24px] border border-white/20 leading-relaxed">
                    {aiSummary}
                   </div>
                 ) : (
                   <div className="space-y-4">
                     <p className="text-xs text-white/70 italic">Genera un resumen inteligente del estado de cuenta con un solo clic.</p>
                     <Button onClick={handleGenerateAiSummary} disabled={loadingAi} className="w-full h-12 bg-accent text-primary font-black rounded-xl">
                       {loadingAi ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Generar Análisis'}
                     </Button>
                   </div>
                 )}
               </CardContent>
            </Card>

            <Card className="border-none shadow-sm rounded-[32px] bg-white p-6">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Condiciones del Plan</h4>
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-xs font-bold text-slate-700">Frecuencia</p>
                  <p className="text-sm text-slate-500">Quincenal (14 días)</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-xs font-bold text-slate-700">Recargo Aplicado</p>
                  <p className="text-sm text-slate-500">{credit?.planType === 6 ? '50% (6 meses)' : '100% (12 meses)'}</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}