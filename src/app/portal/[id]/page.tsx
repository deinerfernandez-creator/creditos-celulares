
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
import { Progress } from '@/components/ui/progress';
import { 
  Smartphone, 
  LogOut,
  BrainCircuit,
  CreditCard,
  Loader2,
  AlertCircle,
  History,
  TrendingUp,
  CheckCircle2,
  Receipt,
  CalendarDays,
  Clock
} from 'lucide-react';
import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where } from 'firebase/firestore';
import { summarizeCreditStatus } from '@/ai/flows/ai-credit-summary-tool';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value);
};

export default function CustomerPortalDashboard() {
  const { id } = useParams();
  const router = useRouter();
  const db = useFirestore();
  
  const [mounted, setMounted] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const customerRef = useMemoFirebase(() => id ? doc(db, 'customers', id as string) : null, [db, id]);
  const { data: customer, isLoading: loadingCustomer } = useDoc(customerRef);

  const creditsQuery = useMemoFirebase(() => {
    if (!id || !db) return null;
    return query(collection(db, 'credits'), where("customerId", "==", id));
  }, [db, id]);
  const { data: creditsData, isLoading: loadingCredits } = useCollection(creditsQuery);
  
  const credit = useMemo(() => {
    if (!creditsData || creditsData.length === 0) return null;
    return [...creditsData].sort((a, b) => {
      const dateA = a.createdAt?.seconds || 0;
      const dateB = b.createdAt?.seconds || 0;
      return dateB - dateA;
    })[0];
  }, [creditsData]);

  const paymentsQuery = useMemoFirebase(() => {
    if (!credit?.id || !db) return null;
    return query(collection(db, 'payments'), where("creditId", "==", credit.id));
  }, [db, credit?.id]);
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

  const logo = PlaceHolderImages.find(img => img.id === 'logo-tecnicell');

  useEffect(() => {
    async function getAiSummary() {
      if (customer && credit && payments && !aiSummary && mounted) {
        setLoadingAi(true);
        try {
          const summary = await summarizeCreditStatus({
            customerName: customer.name,
            loanAmount: credit.initialAmount,
            totalAmountDue: credit.totalAmount,
            remainingBalance: credit.remainingBalance,
            nextPaymentDate: "Próxima quincena",
            paymentFrequency: 'quincenal',
            paymentHistory: payments.map(p => ({
              date: p.date?.toDate ? p.date.toDate().toISOString().split('T')[0] : '---',
              amount: p.amount
            }))
          });
          setAiSummary(summary);
        } catch (err) {
          console.error("AI Summary Error:", err);
          setAiSummary("Análisis de IA no disponible en este momento. Revisa tus abonos detallados abajo.");
        } finally {
          setLoadingAi(false);
        }
      }
    }
    getAiSummary();
  }, [customer, credit, payments, aiSummary, mounted]);

  if (!mounted) return null;

  if (loadingCustomer || loadingCredits) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-slate-500 font-bold tracking-widest uppercase text-[10px]">Validando información financiera...</p>
      </div>
    );
  }

  if (!customer || !credit) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <Card className="max-w-md w-full p-10 border-none shadow-2xl rounded-[2.5rem] bg-white text-center">
          <AlertCircle className="w-16 h-16 text-destructive/20 mx-auto mb-6" />
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Datos no encontrados</h2>
          <p className="text-slate-500 mt-2 mb-8 text-sm font-medium">No hay créditos activos asociados a esta cuenta.</p>
          <Button onClick={() => router.push('/portal')} className="rounded-2xl h-12 w-full font-bold">Volver al portal</Button>
        </Card>
      </div>
    );
  }

  const progress = ((credit.totalAmount - credit.remainingBalance) / credit.totalAmount) * 100;
  const remainingInstallments = credit.installmentAmount > 0 ? Math.ceil(credit.remainingBalance / credit.installmentAmount) : 0;

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-body">
      <header className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-30 px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 overflow-hidden rounded-xl bg-white border border-slate-100 p-1 flex items-center justify-center shadow-sm">
             <Image src={logo?.imageUrl || '/logo.png'} alt="Logo" width={28} height={28} className="object-contain" />
          </div>
          <div className="hidden sm:block">
            <span className="font-black text-lg tracking-tighter text-primary block leading-none">Tecnicell</span>
            <span className="text-[8px] uppercase font-bold text-slate-400 tracking-widest">Portal Clientes</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-slate-900">{customer.name}</p>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">CC: {customer.cedula}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => router.push('/portal')} className="rounded-xl border border-slate-100 gap-2 font-bold text-slate-500">
            <LogOut className="w-4 h-4" /> Salir
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-10 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Hola, {customer.name.split(' ')[0]}</h1>
            <p className="text-slate-500 font-medium text-sm">Estado actual de tu financiamiento</p>
          </div>
          <Badge className={`rounded-full px-6 py-1.5 capitalize text-[10px] font-black tracking-widest ${
            credit.status === 'activo' ? 'bg-green-500' : 
            credit.status === 'pagado' ? 'bg-primary' : 'bg-destructive'
          }`}>
            Crédito {credit.status}
          </Badge>
        </div>

        <Card className="border-none shadow-xl bg-primary text-white overflow-hidden relative rounded-[2rem]">
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <BrainCircuit className="w-32 h-32" />
          </div>
          <CardHeader className="relative z-10 pb-2 pt-6 px-6">
            <div className="flex items-center gap-2 bg-white/10 w-fit px-3 py-1 rounded-full backdrop-blur-sm border border-white/10 mb-2">
              <BrainCircuit className="w-3.5 h-3.5 text-accent" />
              <span className="text-[9px] uppercase font-black tracking-widest">Análisis Gemini IA</span>
            </div>
            <CardTitle className="text-xl font-black">Tu Resumen Financiero</CardTitle>
          </CardHeader>
          <CardContent className="relative z-10 p-6 pt-2">
            {loadingAi ? (
              <div className="flex items-center gap-2 py-4">
                <Loader2 className="w-4 h-4 animate-spin text-accent" />
                <p className="text-sm font-medium opacity-70">Gemini está analizando tu comportamiento de pago...</p>
              </div>
            ) : (
              <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/20 text-sm leading-relaxed font-medium">
                {aiSummary || "Analizando tus abonos para darte un reporte personalizado..."}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none shadow-sm bg-white rounded-[2rem] p-8 border border-slate-100 group hover:shadow-lg transition-all">
            <div className="flex justify-between items-start mb-6">
              <div className="p-3 bg-accent/10 text-accent rounded-xl">
                <TrendingUp className="w-5 h-5" />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo Pendiente</p>
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter">{formatCurrency(credit.remainingBalance)}</h2>
            <p className="text-[9px] text-slate-400 mt-2 font-black uppercase tracking-widest">De {formatCurrency(credit.totalAmount)}</p>
            <div className="mt-6 space-y-2">
              <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-400">
                <span>Tu progreso</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2 rounded-full bg-slate-100" />
            </div>
          </Card>

          <Card className="border-none shadow-sm bg-white rounded-[2rem] p-8 border border-slate-100 group hover:shadow-lg transition-all">
            <div className="flex justify-between items-start mb-6">
              <div className="p-3 bg-primary/10 text-primary rounded-xl">
                <CreditCard className="w-5 h-5" />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cuotas</p>
            </div>
            <div className="flex items-end gap-2 mb-4">
              <h2 className="text-4xl font-black text-slate-900 tracking-tighter">{remainingInstallments}</h2>
              <p className="text-slate-400 font-bold mb-1.5 uppercase text-[9px] tracking-widest">Pendientes</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-bold uppercase tracking-tighter">Valor Cuota:</span>
                <span className="text-primary font-black">{formatCurrency(credit.installmentAmount)}</span>
              </div>
            </div>
          </Card>

          <Card className="border-none shadow-sm bg-white rounded-[2rem] p-8 border border-slate-100 group hover:shadow-lg transition-all">
             <div className="flex justify-between items-start mb-6">
              <div className="p-3 bg-slate-900 text-white rounded-xl">
                <Smartphone className="w-5 h-5" />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tu Equipo</p>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-[9px] uppercase font-black text-slate-300 mb-0.5 tracking-widest">Modelo Comercial</p>
                <p className="text-xl font-black text-slate-900 tracking-tight">{credit.deviceModel}</p>
              </div>
              <div>
                <p className="text-[9px] uppercase font-black text-slate-300 mb-0.5 tracking-widest">IMEI Registrado</p>
                <p className="text-[10px] font-mono font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-lg inline-block">{credit.imei}</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="border-none shadow-sm bg-white rounded-[2rem] p-8 border border-slate-100">
            <CardTitle className="flex items-center gap-3 text-xl font-black text-slate-900 mb-8">
              <CalendarDays className="w-5 h-5 text-primary" /> Cronograma de Cuotas
            </CardTitle>
            <div className="space-y-4">
              {schedule.map((item) => (
                <div key={item.index} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-xl ${item.isPaid ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-400'}`}>
                      {item.isPaid ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className={`text-sm font-black ${item.isPaid ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                        Cuota #{item.index}: {formatCurrency(item.amount)}
                      </p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                        {item.date.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <Badge variant={item.isPaid ? "default" : "outline"} className={`rounded-full text-[8px] font-black tracking-widest ${item.isPaid ? 'bg-green-500' : 'text-slate-400'}`}>
                    {item.isPaid ? 'PAGADA' : 'PENDIENTE'}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card className="border-none shadow-sm bg-white rounded-[2rem] p-8 border border-slate-100">
            <CardTitle className="flex items-center gap-3 text-xl font-black text-slate-900 mb-8">
              <History className="w-5 h-5 text-primary" /> Historial de Abonos
            </CardTitle>
            <div className="space-y-4">
              {loadingPayments ? (
                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-slate-200" /></div>
              ) : payments && payments.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-5 bg-slate-50/50 rounded-2xl border border-slate-100 group hover:bg-white hover:shadow-md transition-all">
                      <div className="flex items-center gap-4">
                        <div className="bg-green-100 text-green-600 p-2.5 rounded-xl group-hover:bg-green-500 group-hover:text-white transition-colors">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-lg font-black text-slate-900">{formatCurrency(p.amount)}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                            {p.date?.toDate ? p.date.toDate().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }) : '---'}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="rounded-full text-[8px] font-black tracking-widest border-green-200 text-green-600 bg-green-50">ABONADO</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-slate-50/50 rounded-[2rem] border-2 border-dashed border-slate-200">
                   <Receipt className="w-10 h-10 text-slate-200 mx-auto mb-4" />
                  <h3 className="text-slate-900 font-black text-sm">Sin abonos registrados</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">Tus pagos aparecerán aquí una vez sean procesados en tienda.</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="p-6 bg-amber-50 rounded-[2rem] border border-amber-100 flex items-start gap-5">
          <div className="bg-amber-100 p-3 rounded-xl text-amber-600">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-base font-black text-amber-900 mb-1 tracking-tight">Recordatorio de Seguridad</p>
            <p className="text-xs text-amber-800 leading-relaxed font-medium">
              Mantener tu crédito al día evita el bloqueo remoto de tu equipo {credit.deviceModel}. 
              Los pagos se realizan únicamente en nuestro punto físico Tecnicell. Presenta este portal para agilizar el proceso.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
