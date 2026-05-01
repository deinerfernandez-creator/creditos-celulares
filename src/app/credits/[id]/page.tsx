"use client";

import React, { useState, useEffect } from 'react';
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
import { 
  ChevronLeft, 
  Loader2,
  Smartphone,
  Calendar,
  AlertCircle,
  Fingerprint,
  Phone,
  MapPin,
  CreditCard
} from 'lucide-react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import Link from 'next/link';

const formatCurrency = (value: any) => {
  const num = Number(value);
  if (isNaN(num)) return '$ 0';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(num);
};

export default function CreditDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const db = useFirestore();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch Credit Data
  const creditRef = useMemoFirebase(() => id ? doc(db, 'credits', id) : null, [db, id]);
  const { data: credit, isLoading: loadingCredit } = useDoc(creditRef);

  // Fetch Customer Data
  const customerRef = useMemoFirebase(() => credit?.customerId ? doc(db, 'customers', credit.customerId) : null, [db, credit?.customerId]);
  const { data: customer, isLoading: loadingCustomer } = useDoc(customerRef);

  if (!mounted || loadingCredit || loadingCustomer) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
        <p className="text-slate-500 font-medium">Cargando detalles...</p>
      </div>
    );
  }

  if (!credit) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-slate-50">
        <AlertCircle className="w-16 h-16 text-destructive/20 mb-6" />
        <h2 className="text-2xl font-black text-slate-900">Crédito no encontrado</h2>
        <p className="text-slate-500 mt-2">No se encontró el registro o no tienes permisos suficientes.</p>
        <Button asChild className="mt-8 rounded-xl px-8">
          <Link href="/">Volver al Dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild className="rounded-full bg-white shadow-sm">
            <Link href="/"><ChevronLeft className="w-5 h-5" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-black text-slate-900">Detalle del Crédito</h1>
            <p className="text-sm text-slate-500">ID: {id}</p>
          </div>
          <Badge className="ml-auto rounded-full px-4 capitalize">
            {credit.status}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Información del Cliente */}
          <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
            <CardHeader className="bg-primary text-white">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Fingerprint className="w-5 h-5" /> Información del Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Nombre Completo</p>
                <p className="font-bold text-lg">{customer?.name || 'No disponible'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Cédula</p>
                  <p className="font-medium">{customer?.cedula || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Teléfono</p>
                  <p className="font-medium flex items-center gap-1">
                    <Phone className="w-3 h-3 text-primary" /> {customer?.phone || 'N/A'}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Dirección</p>
                <p className="font-medium text-sm text-slate-600 flex items-start gap-1">
                  <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  {customer?.address || 'Sin dirección registrada'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Información del Crédito */}
          <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
            <CardHeader className="bg-slate-900 text-white">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Smartphone className="w-5 h-5" /> Detalles del Equipo
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Modelo</p>
                  <p className="font-bold text-xl text-primary">{credit.deviceModel}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">IMEI</p>
                  <p className="font-mono text-xs">{credit.imei}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Total Crédito</p>
                  <p className="text-xl font-black text-slate-900">{formatCurrency(credit.totalAmount)}</p>
                </div>
                <div className="p-4 bg-primary/5 rounded-2xl">
                  <p className="text-[10px] font-black uppercase text-primary tracking-widest mb-1">Saldo Restante</p>
                  <p className="text-xl font-black text-primary">{formatCurrency(credit.remainingBalance)}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-600">Plan de {credit.planType} Cuotas</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-600">Cuota: {formatCurrency(credit.installmentAmount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}