"use client";

import React, { useState, useEffect } from 'react';
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
  Clock, 
  CheckCircle2, 
  LogOut,
  BrainCircuit,
  DollarSign,
  ShieldCheck,
  Loader2,
  Receipt,
  AlertCircle,
  History,
  TrendingUp,
  CreditCard
} from 'lucide-react';
import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where, orderBy } from 'firebase/firestore';
import { summarizeCreditStatus } from '@/ai/flows/ai-credit-summary-tool';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Link from 'next/link';

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

  // 1. Obtener Datos del Cliente
  const customerRef = useMemoFirebase(() => id ? doc(db, 'customers', id as string) : null, [db, id]);
  const { data: customer, isLoading: loadingCustomer } = useDoc(customerRef);

  // 2. Obtener Créditos del Cliente
  const creditsQuery = useMemoFirebase(() => {
    if (!id || !db) return null;
    return query(collection(db, 'credits'), where("customerId", "==", id), orderBy("createdAt", "desc"));
  }, [db, id]);
  const { data: credits, isLoading: loadingCredits } = useCollection(creditsQuery);
  
  const credit = credits?.[0];

  // 3. Obtener Historial de Pagos
  const paymentsQuery = useMemoFirebase(() => {
    if (!credit?.id || !db) return null;
    return query(collection(db, 'payments'), where("creditId", "==", credit.id), orderBy("date", "desc"));
  }, [db, credit?.id]);
  const { data: payments, isLoading: loadingPayments } = useCollection(paymentsQuery);

  const logo = PlaceHolderImages.find(img => img.id === 'logo-tecnicell');

  // 4. Generar Resumen IA
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
              date: p.date instanceof Date ? p.date.toISOString().split('T')[0] : (p.date?.toDate ? p.date.toDate().toISOString().split('T')[0] : String(p.date)),
              amount: p.amount
            }))
          });
          setAiSummary(summary);
        } catch (err) {
          console.error("AI Summary Error:", err);
          setAiSummary("No se pudo generar el resumen de IA. Por favor verifica tus abonos abajo.");
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
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-slate-500 font-medium animate-pulse">Consultando base de datos...</p>
      </div>
    );
  }

  if (!customer || !credit) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8 text-center">
        <Card className="max-w-md w-full p-12 border-none shadow-xl rounded-[2.5rem] bg-white">
          <AlertCircle className="w-16 h-16 text-destructive/20 mx-auto mb-6" />
          <h2 className="text-2xl font-black text-slate-900">Perfil no encontrado</h2>
          <p className="text-slate-500 mt-2 mb-8">No pudimos encontrar un crédito activo vinculado a esta cédula.</p>
          <Button onClick={() => router.push('/portal')} className="rounded-2xl h-12 w-full font-bold">Volver a intentar</Button>
        </Card>
      </div>
    );
  }

  const progress = ((credit.totalAmount - credit.remainingBalance) / credit.totalAmount) * 100;
  const installmentsPaid = Math.floor((credit.totalAmount - credit.remainingBalance) / credit.installmentAmount);
  const totalInstallments = credit.planType;
  const remainingInstallments = Math.max(0, totalInstallments - installmentsPaid);

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-30 px-6 h-20 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 overflow-hidden rounded-2xl bg-white border border-slate-100 p-1 flex items-center justify-center shadow-sm">
             <Image 
              src={logo?.imageUrl || '/logo.png'} 
              alt="Tecnicell Logo" 
              width={36} 
              height={36}
              className="object-contain"
            />
          </div>
          <div className="hidden sm:block">
            <span className="font-black text-xl tracking-tighter text-primary block leading-none">Tecnicell</span>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Portal Clientes</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-slate-900">{customer.name}</p>
            <p className="text-[10px] text-slate-400 font-mono">CC: {customer.cedula}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => router.push('/portal')} className="rounded-2xl border-slate-200 gap-2 font-bold text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all">
            <LogOut className="w-4 h-4" /> Salir
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 md:p-10 space-y-8 animate-in fade-in duration-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Bienvenido, {customer.name.split(' ')[0]}</h1>
            <p className="text-slate-500 font-medium">Aquí tienes el estado actual de tu equipo financiado.</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={`rounded-full px-8 py-2 capitalize text-xs font-black tracking-widest ${
              credit.status === 'activo' ? 'bg-green-500' : 
              credit.status === 'pagado' ? 'bg-primary' : 'bg-destructive'
            }`}>
              {credit.status}
            </Badge>
          </div>
        </div>

        {/* Card IA Resumen */}
        <Card className="border-none shadow-2xl bg-primary text-white overflow-hidden relative rounded-[2.5rem]">
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <BrainCircuit className="w-40 h-40" />
          </div>
          <CardHeader className="relative z-10 pb-2 pt-8 px-8">
            <div className="flex items-center gap-3 bg-white/10 w-fit px-4 py-1.5 rounded-full backdrop-blur-sm border border-white/10 mb-2">
              <BrainCircuit className="w-4 h-4 text-accent" />
              <span className="text-[10px] uppercase font-black tracking-widest">Resumen Inteligente Gemini</span>
            </div>
            <CardTitle className="text-2xl font-black">Estado de tu Crédito</CardTitle>
          </CardHeader>
          <CardContent className="relative z-10 p-8 pt-2">
            {loadingAi ? (
              <div className="h-24 flex items-center justify-center space-x-3">
                <div className="w-2.5 h-2.5 bg-accent rounded-full animate-bounce" />
                <div className="w-2.5 h-2.5 bg-accent rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-2.5 h-2.5 bg-accent rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            ) : (
              <div className="bg-white/10 backdrop-blur-xl p-6 rounded-3xl border border-white/20 text-sm md:text-base leading-relaxed font-medium">
                {aiSummary || "Analizando tu comportamiento de pago para darte un resumen..."}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none shadow-sm bg-white rounded-[2rem] p-8 hover:shadow-xl transition-all border border-slate-50">
            <div className="flex justify-between items-start mb-6">
              <div className="p-4 bg-accent/10 text-accent rounded-2xl">
                <TrendingUp className="w-6 h-6" />
              </div>
              <Badge variant="outline" className="border-slate-100 bg-slate-50 text-slate-400 rounded-full font-black text-[10px] tracking-tighter">SALDO TOTAL</Badge>
            </div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter">{formatCurrency(credit.remainingBalance)}</h2>
            <p className="text-xs text-slate-400 mt-2 font-bold uppercase tracking-widest">De {formatCurrency(credit.totalAmount)}</p>
            <div className="mt-8 space-y-3">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                <span>Tu progreso</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-4 rounded-full bg-slate-100" />
            </div>
          </Card>

          <Card className="border-none shadow-sm bg-white rounded-[2rem] p-8 flex flex-col justify-between hover:shadow-xl transition-all border border-slate-50">
            <div className="flex justify-between items-start mb-6">
              <div className="p-4 bg-primary/10 text-primary rounded-2xl">
                <CreditCard className="w-6 h-6" />
              </div>
              <Badge className="bg-primary/10 text-primary hover:bg-primary/10 border-none rounded-full px-4 py-1 font-black text-[10px] tracking-tighter">PLAN DE PAGO</Badge>
            </div>
            <div className="space-y-6">
              <div className="flex items-end gap-3">
                <h2 className="text-5xl font-black text-slate-900 tracking-tighter">{remainingInstallments}</h2>
                <p className="text-slate-500 font-bold mb-1.5 uppercase text-[10px] tracking-widest">Cuotas pendientes</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400 font-bold">Valor Cuota:</span>
                  <span className="text-primary font-black text-lg">{formatCurrency(credit.installmentAmount)}</span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="border-none shadow-sm bg-white rounded-[2rem] p-8 hover:shadow-xl transition-all border border-slate-50">
             <div className="flex justify-between items-start mb-6">
              <div className="p-4 bg-slate-900 text-white rounded-2xl">
                <Smartphone className="w-6 h-6" />
              </div>
              <Badge className="bg-slate-100 text-slate-500 border-none rounded-full px-4 py-1 font-black text-[10px] tracking-tighter uppercase">Equipo</Badge>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] uppercase font-black text-slate-400 mb-1 tracking-widest">Modelo</p>
                <p className="text-2xl font-black text-slate-900 tracking-tight">{credit.deviceModel}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-black text-slate-400 mb-1 tracking-widest">Identificador IMEI</p>
                <p className="text-xs font-mono font-bold text-slate-500 bg-slate-50 p-2 rounded-xl inline-block">{credit.imei}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Payments History */}
        <Card className="border-none shadow-sm bg-white rounded-[2.5rem] p-10 border border-slate-50 overflow-hidden">
          <CardTitle className="flex items-center gap-3 text-2xl font-black text-slate-900 mb-8">
            <History className="w-6 h-6 text-primary" /> Historial de Abonos
          </CardTitle>
          <div className="space-y-4">
            {loadingPayments ? (
              <div className="flex justify-center py-10"><Loader2 className="animate-spin text-slate-300 w-10 h-10" /></div>
            ) : payments && payments.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-6 bg-slate-50/50 rounded-3xl border border-slate-100 group hover:bg-white hover:shadow-lg transition-all">
                    <div className="flex items-center gap-5">
                      <div className="bg-green-100 text-green-600 p-3 rounded-2xl group-hover:bg-green-500 group-hover:text-white transition-colors">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xl font-black text-slate-900">{formatCurrency(p.amount)}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          {p.date?.toDate ? p.date.toDate().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Fecha no disponible'}
                        </p>
                      </div>
                    </div>
                    <Badge className="rounded-full text-[10px] font-black tracking-widest bg-green-500 text-white border-none px-4">ABONADO</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-slate-50/50 rounded-[2rem] border-2 border-dashed border-slate-200">
                <div className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                   <Receipt className="w-10 h-10 text-slate-200" />
                </div>
                <h3 className="text-slate-900 font-black">Sin abonos registrados</h3>
                <p className="text-sm text-slate-400 mt-2 max-w-xs mx-auto">Cuando realices tu primer abono en tienda, aparecerá reflejado automáticamente aquí.</p>
              </div>
            )}
          </div>
        </Card>

        {/* Footer Info */}
        <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
          <div className="p-8 bg-amber-50 rounded-[2rem] border border-amber-100 flex items-start gap-6">
            <div className="bg-amber-100 p-4 rounded-2xl text-amber-600">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div>
              <p className="text-lg font-black text-amber-900 mb-2 tracking-tight">Recuerda tus fechas de pago</p>
              <p className="text-sm text-amber-800 leading-relaxed font-medium">
                Mantener tu crédito al día evita el bloqueo remoto de tu equipo {credit.deviceModel}. 
                Los pagos se realizan únicamente en nuestro punto físico Tecnicell. Presenta tu Cédula o este portal para agilizar el proceso.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}