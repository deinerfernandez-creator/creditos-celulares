"use client";

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardDescription, 
  CardFooter 
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
  CheckCircle2, 
  AlertCircle,
  BrainCircuit,
  DollarSign,
  History,
  FileText
} from 'lucide-react';
import { 
  MOCK_CREDITS, 
  MOCK_CUSTOMERS, 
  MOCK_INSTALLMENTS, 
  MOCK_PAYMENTS 
} from '@/lib/mock-data';
import { summarizeCreditStatus } from '@/ai/flows/ai-credit-summary-tool';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function CreditDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { toast } = useToast();
  
  const credit = MOCK_CREDITS.find(c => c.id === id);
  const customer = MOCK_CUSTOMERS.find(c => c.id === credit?.customerId);
  const installments = MOCK_INSTALLMENTS.filter(i => i.creditId === id);
  const payments = MOCK_PAYMENTS.filter(p => p.creditId === id);

  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  if (!credit || !customer) return <div>Cargando...</div>;

  const handleGenerateAiSummary = async () => {
    setLoadingAi(true);
    try {
      const summary = await summarizeCreditStatus({
        customerName: customer.name,
        loanAmount: credit.initialAmount,
        totalAmountDue: credit.totalAmount,
        remainingBalance: credit.remainingBalance,
        nextPaymentDate: installments.find(i => i.status === 'pendiente')?.dueDate || 'Finalizado',
        paymentFrequency: 'quincenal',
        paymentHistory: payments.map(p => ({ date: p.date, amount: p.amount }))
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
              <p className="text-muted-foreground flex items-center gap-2 mt-1">
                <span className="font-mono text-xs uppercase bg-slate-200 px-2 py-1 rounded">{credit.id}</span>
                <span>•</span>
                <span>Registrado el {credit.createdAt}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <Button variant="outline" className="rounded-xl border-slate-200 bg-white">Editar</Button>
             <Button className="rounded-xl bg-primary text-white shadow-lg shadow-primary/20">Registrar Pago</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Info Column */}
          <div className="lg:col-span-3 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-none shadow-sm bg-white">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <User className="w-3 h-3" /> Cliente
                  </CardDescription>
                  <CardTitle className="text-lg">{customer.name}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  <p className="text-muted-foreground">{customer.email}</p>
                  <p className="font-medium mt-1">{customer.phone}</p>
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
                  <p className="text-muted-foreground">Plan: {credit.planType} Quincenas</p>
                  <p className="font-medium mt-1">Monto Inicial: ${credit.initialAmount}</p>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm bg-white border-l-4 border-primary">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2 text-primary font-bold">
                    <DollarSign className="w-3 h-3" /> Saldo Pendiente
                  </CardDescription>
                  <CardTitle className="text-3xl font-black">${credit.remainingBalance}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                     <div 
                       className="bg-primary h-1.5 rounded-full" 
                       style={{ width: `${((credit.totalAmount - credit.remainingBalance) / credit.totalAmount) * 100}%` }}
                     />
                  </div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-2 font-bold">Total a pagar: ${credit.totalAmount}</p>
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
                  <div className="divide-y">
                    {installments.map((inst, idx) => (
                      <div key={inst.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-4">
                           <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${inst.status === 'pagado' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'}`}>
                             {idx + 1}
                           </div>
                           <div>
                             <p className="font-semibold">${inst.amount}</p>
                             <p className="text-xs text-muted-foreground flex items-center gap-1">
                               <Clock className="w-3 h-3" /> Vence el {inst.dueDate}
                             </p>
                           </div>
                        </div>
                        <div className="flex items-center gap-4">
                           {inst.status === 'pagado' ? (
                             <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none px-3 py-1 rounded-full flex items-center gap-1">
                               <CheckCircle2 className="w-3 h-3" /> Pagado
                             </Badge>
                           ) : (
                             <Badge variant="outline" className="border-slate-200 px-3 py-1 rounded-full">Pendiente</Badge>
                           )}
                           <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                             <FileText className="w-4 h-4" />
                           </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="history" className="mt-6">
                <Card className="border-none shadow-sm bg-white">
                  <CardContent className="p-0">
                    <div className="divide-y">
                      {payments.length === 0 ? (
                        <div className="p-12 text-center text-muted-foreground">No hay pagos registrados aún.</div>
                      ) : (
                        payments.map(payment => (
                          <div key={payment.id} className="flex items-center justify-between p-6">
                            <div className="flex items-center gap-4">
                               <div className="p-3 bg-primary/10 rounded-xl">
                                  <DollarSign className="w-5 h-5 text-primary" />
                               </div>
                               <div>
                                  <p className="font-bold text-lg">Pago de Cuota</p>
                                  <p className="text-sm text-muted-foreground">{payment.date}</p>
                               </div>
                            </div>
                            <div className="text-right">
                               <p className="text-xl font-bold text-primary">+${payment.amount}</p>
                               <p className="text-xs text-muted-foreground">Comprobante: {payment.id}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar Info Column */}
          <div className="space-y-8">
            <Card className="border-none shadow-xl bg-gradient-to-br from-primary to-primary/80 text-white overflow-hidden relative">
               <div className="absolute top-0 right-0 p-4 opacity-10">
                  <BrainCircuit className="w-24 h-24" />
               </div>
               <CardHeader className="relative z-10 pb-0">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BrainCircuit className="w-5 h-5 text-accent" />
                    Resumen IA
                  </CardTitle>
                  <CardDescription className="text-white/60">Análisis inteligente del crédito</CardDescription>
               </CardHeader>
               <CardContent className="relative z-10 pt-6">
                 {aiSummary ? (
                   <div className="text-sm leading-relaxed bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/10 animate-in zoom-in duration-300">
                     {aiSummary}
                   </div>
                 ) : (
                   <div className="text-center py-6 space-y-4">
                      <p className="text-sm text-white/70">Obtén una visión rápida del estado de este cliente.</p>
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
               {aiSummary && (
                 <CardFooter className="pt-0 relative z-10">
                   <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-white/60 hover:text-white hover:bg-white/10 mx-auto text-xs"
                    onClick={() => setAiSummary(null)}
                   >
                     Limpiar resumen
                   </Button>
                 </CardFooter>
               )}
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
                   <p className="text-xs text-orange-700">Próxima cuota vence en 12 días.</p>
                </div>
                <div className="p-3 bg-green-50 rounded-xl border border-green-100 flex gap-3">
                   <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                   <p className="text-xs text-green-700">El cliente mantiene un historial excelente de puntualidad.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}