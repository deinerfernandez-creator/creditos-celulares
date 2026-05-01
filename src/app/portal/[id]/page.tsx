
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
  Calendar, 
  Clock, 
  CheckCircle2, 
  LogOut,
  BrainCircuit,
  DollarSign,
  ChevronRight,
  ShieldCheck,
  Loader2
} from 'lucide-react';
import { useFirestore, useDoc, useCollection } from '@/firebase';
import { doc, collection, query, where, orderBy } from 'firebase/firestore';
import { summarizeCreditStatus } from '@/ai/flows/ai-credit-summary-tool';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function CustomerPortalPage() {
  const { id } = useParams();
  const router = useRouter();
  const db = useFirestore();
  
  // Datos del Cliente
  const customerRef = useMemo(() => id ? doc(db, 'customers', id as string) : null, [db, id]);
  const { data: customer, loading: loadingCustomer } = useDoc(customerRef);

  // Créditos del Cliente
  const creditsQuery = useMemo(() => {
    if (!id) return null;
    return query(collection(db, 'credits'), where("customerId", "==", id), orderBy("createdAt", "desc"));
  }, [db, id]);
  const { data: credits, loading: loadingCredits } = useCollection(creditsQuery);
  
  const credit = credits?.[0]; // Tomamos el crédito más reciente

  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  
  const logo = PlaceHolderImages.find(img => img.id === 'logo-tecnicell');

  // Generar resumen automáticamente al entrar
  useEffect(() => {
    async function getAiSummary() {
      if (customer && credit && !aiSummary) {
        setLoadingAi(true);
        try {
          const summary = await summarizeCreditStatus({
            customerName: customer.name,
            loanAmount: credit.initialAmount,
            totalAmountDue: credit.totalAmount,
            remainingBalance: credit.remainingBalance,
            nextPaymentDate: "Próximamente", // En un sistema real vendría del cronograma
            paymentFrequency: 'quincenal',
            paymentHistory: [] // Por implementar subcolección de pagos
          });
          setAiSummary(summary);
        } catch (err) {
          console.error(err);
        } finally {
          setLoadingAi(false);
        }
      }
    }
    getAiSummary();
  }, [customer, credit, aiSummary]);

  if (loadingCustomer || loadingCredits) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-slate-500 animate-pulse">Cargando tu información...</p>
      </div>
    );
  }

  if (!customer || !credit) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8 text-center">
        <Card className="max-w-md w-full p-12 border-none shadow-xl rounded-3xl">
          <ShieldCheck className="w-16 h-16 text-slate-200 mx-auto mb-6" />
          <h2 className="text-2xl font-bold">No se encontraron créditos</h2>
          <p className="text-slate-500 mt-2 mb-8">No tienes planes activos registrados con nosotros.</p>
          <Button onClick={() => router.push('/portal')} variant="outline" className="rounded-xl h-12 w-full">Volver</Button>
        </Card>
      </div>
    );
  }

  const progress = ((credit.totalAmount - credit.remainingBalance) / credit.totalAmount) * 100;

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-20 px-4 h-16 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
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
        </div>
        <Button variant="ghost" size="sm" onClick={() => router.push('/portal')} className="text-slate-500 gap-2 rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors">
          <LogOut className="w-4 h-4" /> Salir
        </Button>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-700">
        {/* Welcome Section */}
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-slate-900">Hola, {customer.name.split(' ')[0]} 👋</h1>
          <p className="text-slate-500 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-green-500" /> Tu equipo {credit.deviceModel} está registrado
          </p>
        </div>

        {/* AI Summary Card */}
        <Card className="border-none shadow-xl bg-gradient-to-br from-primary to-primary/80 text-white overflow-hidden relative rounded-3xl">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <BrainCircuit className="w-32 h-32" />
          </div>
          <CardHeader className="relative z-10 pb-0">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BrainCircuit className="w-5 h-5 text-accent" />
              Estado de tu Crédito (Análisis IA)
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
                {aiSummary || "Analizando tu cuenta..."}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-none shadow-sm bg-white rounded-3xl p-6 hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="p-4 bg-accent/10 text-accent rounded-2xl">
                <DollarSign className="w-6 h-6" />
              </div>
              <Badge variant="outline" className="border-slate-100 bg-slate-50 text-slate-500 rounded-full font-bold">Saldo Actual</Badge>
            </div>
            <h2 className="text-4xl font-black text-slate-900">${credit.remainingBalance}</h2>
            <p className="text-sm text-slate-500 mt-2 font-medium">De un total pactado de ${credit.totalAmount}</p>
            <div className="mt-8 space-y-2">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                <span>Progreso de Pago</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-3 rounded-full bg-slate-100" />
            </div>
          </Card>

          <Card className="border-none shadow-sm bg-white rounded-3xl p-6 flex flex-col justify-between hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="p-4 bg-primary/10 text-primary rounded-2xl">
                <Calendar className="w-6 h-6" />
              </div>
              <Badge className="bg-primary/10 text-primary hover:bg-primary/10 border-none rounded-full px-4 py-1 font-bold">Plan Quincenal</Badge>
            </div>
            <div className="space-y-1">
              <h2 className="text-4xl font-black text-slate-900">${credit.installmentAmount}</h2>
              <p className="text-lg font-bold text-primary flex items-center gap-2">
                <Clock className="w-5 h-5" /> Cuota fija de tu plan
              </p>
            </div>
            <Button className="w-full mt-8 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl h-14 font-bold shadow-lg shadow-slate-200">
              ¿Cómo realizar pagos? <ChevronRight className="ml-2 w-5 h-5" />
            </Button>
          </Card>
        </div>

        {/* Device Info */}
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
            <div className="p-6 bg-primary/5 rounded-2xl border border-primary/10 flex items-start gap-4">
              <ShieldCheck className="w-6 h-6 text-primary shrink-0" />
              <div>
                <p className="text-xs text-primary font-black mb-2 italic">Aviso de Bloqueo:</p>
                <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                  Para mantener tu equipo desbloqueado, asegúrate de realizar tus pagos antes de la fecha de vencimiento. 
                  En caso de retraso, el sistema procederá al bloqueo automático hasta que se registre el pago.
                </p>
              </div>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
