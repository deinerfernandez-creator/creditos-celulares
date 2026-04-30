"use client";

import React, { useState, useEffect } from 'react';
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
import { Progress } from '@/components/ui/progress';
import { 
  Smartphone, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  LogOut,
  BrainCircuit,
  DollarSign,
  ChevronRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { 
  MOCK_CREDITS, 
  MOCK_CUSTOMERS, 
  MOCK_INSTALLMENTS, 
  MOCK_PAYMENTS 
} from '@/lib/mock-data';
import { summarizeCreditStatus } from '@/ai/flows/ai-credit-summary-tool';
import { useToast } from '@/hooks/use-toast';

export default function CustomerPortalPage() {
  const { id } = useParams();
  const router = useRouter();
  const { toast } = useToast();
  
  const customer = MOCK_CUSTOMERS.find(c => c.id === id);
  const credits = MOCK_CREDITS.filter(c => c.customerId === id);
  const credit = credits[0]; // Tomamos el primero por simplicidad en el MVP
  
  const installments = MOCK_INSTALLMENTS.filter(i => i.creditId === credit?.id);
  const payments = MOCK_PAYMENTS.filter(p => p.creditId === credit?.id);

  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  // Generar resumen automáticamente al entrar
  useEffect(() => {
    if (customer && credit && !aiSummary) {
      handleGenerateAiSummary();
    }
  }, [customer, credit]);

  if (!customer) return <div className="p-12 text-center font-bold">Cliente no encontrado...</div>;
  if (!credit) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
      <Card className="max-w-md w-full text-center p-8 border-none shadow-xl rounded-3xl">
        <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold">No tienes créditos activos</h2>
        <p className="text-slate-500 mt-2 mb-6">Actualmente no cuentas con planes de financiamiento registrados.</p>
        <Button onClick={() => router.push('/portal')} variant="outline" className="rounded-xl">Volver al inicio</Button>
      </Card>
    </div>
  );

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
      console.error(err);
    } finally {
      setLoadingAi(false);
    }
  };

  const progress = ((credit.totalAmount - credit.remainingBalance) / credit.totalAmount) * 100;
  const nextInstallment = installments.find(i => i.status === 'pendiente');

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-20 px-4 h-16 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-primary rounded-lg text-white">
            <Smartphone className="w-5 h-5" />
          </div>
          <span className="font-black text-xl tracking-tight text-primary">Tecnicell</span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => router.push('/portal')} className="text-slate-500 gap-2 rounded-xl">
          <LogOut className="w-4 h-4" /> Salir
        </Button>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
        {/* Welcome Section */}
        <div className="space-y-2">
          <h1 className="text-3xl font-black text-slate-900">Hola, {customer.name.split(' ')[0]} 👋</h1>
          <p className="text-slate-500 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-green-500" /> Tu cuenta está al día
          </p>
        </div>

        {/* AI Summary Card */}
        <Card className="border-none shadow-xl bg-gradient-to-br from-primary to-primary/80 text-white overflow-hidden relative rounded-3xl">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <BrainCircuit className="w-32 h-32" />
          </div>
          <CardHeader className="relative z-10">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BrainCircuit className="w-5 h-5 text-accent" />
              Estado de tu Crédito (Análisis IA)
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10 pt-0">
            {loadingAi ? (
              <div className="h-24 flex items-center justify-center space-x-2">
                <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            ) : (
              <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/20 text-sm leading-relaxed">
                {aiSummary || "Analizando tu cuenta..."}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-none shadow-sm bg-white rounded-3xl p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-accent/10 text-accent rounded-2xl">
                <DollarSign className="w-6 h-6" />
              </div>
              <Badge variant="outline" className="border-slate-100 bg-slate-50 text-slate-500 rounded-full">Saldo Actual</Badge>
            </div>
            <h2 className="text-4xl font-black text-slate-900">${credit.remainingBalance}</h2>
            <p className="text-sm text-slate-500 mt-2">De un total de ${credit.totalAmount}</p>
            <div className="mt-6 space-y-2">
              <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
                <span>Progreso de Pago</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-3 rounded-full bg-slate-100" />
            </div>
          </Card>

          <Card className="border-none shadow-sm bg-white rounded-3xl p-6 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-primary/10 text-primary rounded-2xl">
                <Calendar className="w-6 h-6" />
              </div>
              <Badge className="bg-primary/10 text-primary hover:bg-primary/10 border-none rounded-full px-3">Próximo Pago</Badge>
            </div>
            {nextInstallment ? (
              <div className="space-y-1">
                <h2 className="text-4xl font-black text-slate-900">${nextInstallment.amount}</h2>
                <p className="text-lg font-bold text-primary flex items-center gap-2">
                  <Clock className="w-5 h-5" /> Vence el {nextInstallment.dueDate}
                </p>
              </div>
            ) : (
              <p className="text-lg font-bold text-green-600">¡Crédito Finalizado!</p>
            )}
            <Button className="w-full mt-6 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl h-12 shadow-lg shadow-slate-200">
              ¿Cómo pagar? <ChevronRight className="ml-2 w-4 h-4" />
            </Button>
          </Card>
        </div>

        {/* Device Info & Timeline */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 border-none shadow-sm bg-white rounded-3xl overflow-hidden">
            <CardHeader className="border-b bg-slate-50/30">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-slate-400" /> Cronograma de Cuotas
              </CardTitle>
            </CardHeader>
            <div className="divide-y divide-slate-50">
              {installments.map((inst, idx) => (
                <div key={inst.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black ${inst.status === 'pagado' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">${inst.amount}</p>
                      <p className="text-xs text-slate-500">Vence: {inst.dueDate}</p>
                    </div>
                  </div>
                  {inst.status === 'pagado' ? (
                    <Badge className="bg-green-50 text-green-600 border-none rounded-full px-3 py-1 text-[10px] uppercase font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Pagado
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-slate-400 border-slate-200 rounded-full px-3 py-1 text-[10px] uppercase font-bold">Pendiente</Badge>
                  )}
                </div>
              ))}
            </div>
          </Card>

          <Card className="border-none shadow-sm bg-white rounded-3xl p-6">
            <CardTitle className="text-sm uppercase tracking-widest text-slate-400 font-bold mb-6">Detalles del Equipo</CardTitle>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-slate-50 rounded-2xl text-slate-600">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Modelo</p>
                  <p className="font-bold text-slate-900">{credit.deviceModel}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-slate-50 rounded-2xl text-slate-600">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Estado del Equipo</p>
                  <p className="font-bold text-slate-900">Bloqueo Activo (PayJoy)</p>
                </div>
              </div>
              <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                <p className="text-xs text-primary font-bold mb-1 italic">Nota de Soporte:</p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Recuerda realizar tus pagos a tiempo para evitar el bloqueo automático de tu equipo. 
                  En caso de bloqueo, el sistema lo liberará en máximo 30 min tras confirmar tu pago.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
