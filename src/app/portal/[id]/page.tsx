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
  Calendar, 
  Clock, 
  CheckCircle2, 
  LogOut,
  BrainCircuit,
  DollarSign,
  ChevronRight,
  ShieldCheck,
  Loader2,
  Receipt,
  AlertCircle,
  History
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

export default function CustomerPortalPage() {
  const { id } = useParams();
  const router = useRouter();
  const db = useFirestore();
  
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const customerRef = useMemoFirebase(() => id ? doc(db, 'customers', id as string) : null, [db, id]);
  const { data: customer, isLoading: loadingCustomer } = useDoc(customerRef);

  const creditsQuery = useMemoFirebase(() => {
    if (!id || !db) return null;
    return query(collection(db, 'credits'), where("customerId", "==", id), orderBy("createdAt", "desc"));
  }, [db, id]);
  const { data: credits, isLoading: loadingCredits } = useCollection(creditsQuery);
  
  const credit = credits?.[0];

  const paymentsQuery = useMemoFirebase(() => {
    if (!credit?.id || !db) return null;
    return query(collection(db, 'payments'), where("creditId", "==", credit.id), orderBy("date", "desc"));
  }, [db, credit?.id]);
  const { data: payments, isLoading: loadingPayments } = useCollection(paymentsQuery);

  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  
  const logo = PlaceHolderImages.find(img => img.id === 'logo-tecnicell');

  useEffect(() => {
    async function getAiSummary() {
      if (customer && credit && payments && !aiSummary) {
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
          console.error(err);
        } finally {
          setLoadingAi(false);
        }
      }
    }
    if (mounted) getAiSummary();
  }, [customer, credit, payments, aiSummary, mounted]);

  if (!mounted || loadingCustomer || loadingCredits) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-slate-500 animate-pulse">Cargando tu información financiera...</p>
      </div>
    );
  }

  if (!customer || !credit) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8 text-center">
        <Card className="max-w-md w-full p-12 border-none shadow-xl rounded-3xl">
          <AlertCircle className="w-16 h-16 text-destructive/20 mx-auto mb-6" />
          <h2 className="text-2xl font-bold">Información no disponible</h2>
          <p className="text-slate-500 mt-2 mb-8">No pudimos encontrar datos vinculados a tu perfil.</p>
          <Button onClick={() => router.push('/portal')} variant="outline" className="rounded-xl h-12 w-full">Volver al inicio</Button>
        </Card>
      </div>
    );
  }

  const progress = ((credit.totalAmount - credit.remainingBalance) / credit.totalAmount) * 100;
  const installmentsPaid = Math.floor((credit.totalAmount - credit.remainingBalance) / credit.installmentAmount);
  const totalInstallments = credit.planType;
  const remainingInstallments = Math.max(0, totalInstallments - installmentsPaid);

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <header className="bg-white border-b sticky top-0 z-20 px-4 h-16 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/portal" className="flex items-center gap-2">
            <div className="relative w-10 h-10 overflow-hidden rounded-lg bg-white border border-slate-100 p-1 flex items-center justify-center">
               <Image 
                src={logo?.imageUrl || '/logo.png'} 
                alt="Tecnicell Logo" 
                width={32} 
                height={32}
                className="object-contain"
              />
            </div>
            <span className="font-black text-xl tracking-tight text-primary">Tecnicell</span>
          </Link>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => router.push('/portal')} className="text-slate-500 gap-2 rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors">
            <LogOut className="w-4 h-4" /> Salir
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-700">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-slate-900">Hola, {customer.name}</h1>
            <p className="text-slate-500 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-green-500" /> Cédula: {customer.cedula}
            </p>
          </div>
          <Badge className={`rounded-full px-6 py-1 capitalize text-sm font-bold ${
            credit.status === 'activo' ? 'bg-green-500' : 
            credit.status === 'pagado' ? 'bg-primary' : 'bg-destructive'
          }`}>
            Estado: {credit.status}
          </Badge>
        </div>

        <Card className="border-none shadow-xl bg-gradient-to-br from-primary to-primary/80 text-white overflow-hidden relative rounded-3xl">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <BrainCircuit className="w-32 h-32" />
          </div>
          <CardHeader className="relative z-10 pb-0">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BrainCircuit className="w-5 h-5 text-accent" />
              Resumen de Cuenta (IA)
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10 pt-4">
            {loadingAi ? (
              <div className="h-20 flex items-center justify-center space-x-2">
                <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            ) : (
              <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/20 text-sm leading-relaxed">
                {aiSummary || "Analizando tu comportamiento de pago..."}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-none shadow-sm bg-white rounded-3xl p-6 hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="p-4 bg-accent/10 text-accent rounded-2xl">
                <DollarSign className="w-6 h-6" />
              </div>
              <Badge variant="outline" className="border-slate-100 bg-slate-50 text-slate-500 rounded-full font-bold">Saldo Pendiente</Badge>
            </div>
            <h2 className="text-3xl font-black text-slate-900">{formatCurrency(credit.remainingBalance)}</h2>
            <p className="text-sm text-slate-500 mt-2 font-medium">De un total de {formatCurrency(credit.totalAmount)}</p>
            <div className="mt-8 space-y-2">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                <span>Progreso del Crédito</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-3 rounded-full bg-slate-100" />
            </div>
          </Card>

          <Card className="border-none shadow-sm bg-white rounded-3xl p-6 flex flex-col justify-between hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="p-4 bg-primary/10 text-primary rounded-2xl">
                <Receipt className="w-6 h-6" />
              </div>
              <Badge className="bg-primary/10 text-primary hover:bg-primary/10 border-none rounded-full px-4 py-1 font-bold">Cuotas</Badge>
            </div>
            <div className="space-y-4">
              <div className="flex items-end gap-2">
                <h2 className="text-4xl font-black text-slate-900">{remainingInstallments}</h2>
                <p className="text-slate-500 font-bold mb-1">Cuotas restantes</p>
              </div>
              <div className="flex items-center gap-4 text-sm text-slate-600">
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>{installmentsPaid} pagadas</span>
                </div>
                <div className="w-px h-4 bg-slate-200" />
                <div className="font-bold text-primary">
                  Valor cuota: {formatCurrency(credit.installmentAmount)}
                </div>
              </div>
            </div>
          </Card>
        </div>

        <Card className="border-none shadow-sm bg-white rounded-3xl p-8">
          <CardTitle className="flex items-center gap-2 text-lg font-black text-slate-900 mb-6">
            <History className="w-5 h-5 text-primary" /> Historial de Abonos
          </CardTitle>
          <div className="space-y-4">
            {loadingPayments ? (
              <div className="flex justify-center py-4"><Loader2 className="animate-spin text-slate-400" /></div>
            ) : payments && payments.length > 0 ? (
              <div className="grid gap-3">
                {payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="bg-green-100 text-green-600 p-2 rounded-full"><CheckCircle2 className="w-4 h-4" /></div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{formatCurrency(p.amount)}</p>
                        <p className="text-[10px] text-slate-400">{p.date?.toDate ? p.date.toDate().toLocaleDateString() : 'Fecha no disponible'}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="rounded-full text-[10px] border-green-200 text-green-600 bg-green-50">Recibido</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No hay abonos registrados aún.</p>
              </div>
            )}
          </div>
        </Card>

        <Card className="border-none shadow-sm bg-white rounded-3xl p-8">
          <CardTitle className="text-xs uppercase tracking-[0.2em] text-slate-400 font-black mb-8">Información del Equipo Vinculado</CardTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex items-center gap-5">
              <div className="p-4 bg-slate-50 rounded-2xl text-slate-600 border border-slate-100">
                <Smartphone className="w-8 h-8" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-black text-slate-400 mb-1">Modelo de Teléfono</p>
                <p className="text-xl font-bold text-slate-900">{credit.deviceModel}</p>
                <p className="text-xs font-mono text-slate-500 mt-1">IMEI: {credit.imei}</p>
              </div>
            </div>
            <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-4">
              <Clock className="w-6 h-6 text-amber-600 shrink-0" />
              <div>
                <p className="text-xs text-amber-700 font-black mb-2 italic">Aviso Importante:</p>
                <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                  Recuerda realizar tus pagos a tiempo para evitar bloqueos del equipo. Puedes realizar tus abonos en nuestra tienda física.
                </p>
              </div>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}