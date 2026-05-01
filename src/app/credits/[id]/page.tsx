
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
  ExternalLink
} from 'lucide-react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { summarizeCreditStatus } from '@/ai/flows/ai-credit-summary-tool';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

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
  const db = useFirestore();

  // Fetch real data with proper memoization
  const creditRef = useMemoFirebase(() => id ? doc(db, 'credits', id as string) : null, [db, id]);
  const { data: credit, loading: loadingCredit } = useDoc(creditRef);

  const customerRef = useMemoFirebase(() => credit?.customerId ? doc(db, 'customers', credit.customerId) : null, [db, credit?.customerId]);
  const { data: customer, loading: loadingCustomer } = useDoc(customerRef);

  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  if (loadingCredit || loadingCustomer) {
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

  const handleGenerateAiSummary = async () => {
    setLoadingAi(true);
    try {
      const summary = await summarizeCreditStatus({
        customerName: customer.name,
        loanAmount: credit.initialAmount - (credit.downPayment || 0),
        totalAmountDue: credit.totalAmount,
        remainingBalance: credit.remainingBalance,
        nextPaymentDate: 'Por definir',
        paymentFrequency: 'quincenal',
        paymentHistory: []
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

  const progress = ((credit.totalAmount - credit.remainingBalance) / credit.totalAmount) * 100;

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
                <Badge variant={credit.status === 'activo' ? 'default' : 'secondary'}>{credit.status}</Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <Button variant="outline" asChild className="rounded-xl border-slate-200 bg-white">
               <Link href={`/portal/${customer.id}`} target="_blank" className="flex items-center gap-2">
                 <Smartphone className="w-4 h-4" /> Ver Portal del Cliente <ExternalLink className="w-3 h-3" />
               </Link>
             </Button>
             <Button className="rounded-xl bg-primary text-white shadow-lg shadow-primary/20">Registrar Pago</Button>
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
                  <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                     <div 
                       className="bg-primary h-1.5 rounded-full" 
                       style={{ width: `${progress}%` }}
                     />
                  </div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-2 font-bold">Financiado: {formatCurrency(credit.totalAmount)}</p>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="installments" className="w-full">
              <TabsList className="bg-slate-100 p-1 rounded-xl h-12 w-full max-w-md">
                <TabsTrigger value="installments" className="rounded-lg flex-1 h-full data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <Calendar className="w-4 h-4 mr-2" /> Cronograma
                </TabsTrigger>
                <TabsTrigger value="history" className="rounded-lg flex-1 h-full data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <History className="w-4 h-4 mr-2" /> Pagos
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="installments" className="mt-6">
                <Card className="border-none shadow-sm bg-white p-8 text-center text-muted-foreground">
                   <p>Cronograma de pagos en desarrollo...</p>
                   <p className="text-xs mt-2">Próximamente verás las cuotas quincenales aquí.</p>
                </Card>
              </TabsContent>

              <TabsContent value="history" className="mt-6">
                <Card className="border-none shadow-sm bg-white p-8 text-center text-muted-foreground">
                   No hay pagos registrados aún.
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
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
