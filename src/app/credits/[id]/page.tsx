"use client";

import React, { useState, useEffect, useMemo } from 'react';
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
  CreditCard,
  Settings2,
  Receipt,
  CheckCircle2,
  History
} from 'lucide-react';
import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, collection, query, where, orderBy } from 'firebase/firestore';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
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

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'activo':
      return <Badge className="bg-green-500 hover:bg-green-600 rounded-full px-4 capitalize">Activo</Badge>;
    case 'pagado':
      return <Badge className="bg-primary hover:bg-primary/90 rounded-full px-4 capitalize">Pagado</Badge>;
    case 'bloqueado':
      return <Badge variant="destructive" className="rounded-full px-4 capitalize">Bloqueado</Badge>;
    default:
      return <Badge variant="secondary" className="rounded-full px-4 capitalize">{status}</Badge>;
  }
};

export default function CreditDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const db = useFirestore();
  const { toast } = useToast();

  const [mounted, setMounted] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch Credit Data
  const creditRef = useMemoFirebase(() => id ? doc(db, 'credits', id) : null, [db, id]);
  const { data: credit, isLoading: loadingCredit } = useDoc(creditRef);

  // Fetch Customer Data
  const customerRef = useMemoFirebase(() => credit?.customerId ? doc(db, 'customers', credit.customerId) : null, [db, credit?.customerId]);
  const { data: customer, isLoading: loadingCustomer } = useDoc(customerRef);

  // Fetch Payments History
  const paymentsQuery = useMemoFirebase(() => {
    if (!id || !db) return null;
    return query(collection(db, 'payments'), where("creditId", "==", id), orderBy("date", "desc"));
  }, [db, id]);
  const { data: payments, isLoading: loadingPayments } = useCollection(paymentsQuery);

  const handleStatusChange = async (newStatus: string) => {
    if (!id || !db) return;
    setUpdating(true);
    try {
      await updateDoc(doc(db, 'credits', id), { status: newStatus });
      toast({
        title: "Estado actualizado",
        description: `El crédito ahora está ${newStatus}.`,
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado: " + err.message,
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };

  const progress = useMemo(() => {
    if (!credit?.totalAmount || !credit?.remainingBalance) return 0;
    const paid = credit.totalAmount - credit.remainingBalance;
    return Math.min(100, Math.max(0, (paid / credit.totalAmount) * 100));
  }, [credit]);

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
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild className="rounded-full bg-white shadow-sm border-slate-200">
              <Link href="/"><ChevronLeft className="w-5 h-5" /></Link>
            </Button>
            <div>
              <h1 className="text-2xl font-black text-slate-900">Gestión de Crédito</h1>
              <p className="text-xs text-slate-400 font-mono">#{id.slice(0, 8)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:ml-auto">
            <div className="flex items-center gap-2 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
              <Settings2 className="w-4 h-4 text-slate-400 ml-2" />
              <Select onValueChange={handleStatusChange} defaultValue={credit.status} disabled={updating}>
                <SelectTrigger className="w-[140px] border-none shadow-none focus:ring-0 h-8 font-bold capitalize">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="activo" className="text-green-600 font-bold">Activo</SelectItem>
                  <SelectItem value="pagado" className="text-primary font-bold">Pagado</SelectItem>
                  <SelectItem value="bloqueado" className="text-destructive font-bold">Bloqueado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {getStatusBadge(credit.status)}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Información del Cliente */}
          <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-primary text-white pb-6">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Fingerprint className="w-5 h-5" /> Perfil del Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Nombre Completo</p>
                <p className="font-bold text-lg text-slate-900">{customer?.name || 'Cargando...'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-2xl">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Cédula</p>
                  <p className="font-bold text-slate-700">{customer?.cedula || 'N/A'}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Teléfono</p>
                  <p className="font-bold text-primary flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {customer?.phone || 'N/A'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2 pt-2">
                <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Dirección</p>
                  <p className="text-sm font-medium text-slate-600 leading-snug">
                    {customer?.address || 'Sin dirección registrada'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Información del Equipo */}
          <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-900 text-white pb-6">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Smartphone className="w-5 h-5 text-accent" /> Datos del Equipo
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Modelo Comercial</p>
                  <p className="font-black text-2xl text-primary">{credit.deviceModel}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Identificador IMEI</p>
                  <p className="font-mono text-sm bg-slate-100 px-2 py-1 rounded-lg text-slate-600">{credit.imei}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Saldo Pendiente</p>
                  <p className="text-xl font-black text-slate-900">{formatCurrency(credit.remainingBalance)}</p>
                </div>
                <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 text-right">
                  <p className="text-[10px] font-black uppercase text-primary tracking-widest mb-1">Progreso</p>
                  <p className="text-xl font-black text-primary">{Math.round(progress)}%</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-bold text-slate-600">Plan de {credit.planType} Cuotas</span>
                </div>
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-bold text-slate-600">Cuota: {formatCurrency(credit.installmentAmount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Historial de Pagos */}
        <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
          <CardHeader className="border-b border-slate-50 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <History className="w-5 h-5 text-primary" /> Historial de Abonos
              </CardTitle>
              <CardDescription>Registro completo de entradas de dinero</CardDescription>
            </div>
            <Button size="sm" className="rounded-xl shadow-lg shadow-primary/20">
              <History className="w-4 h-4 mr-2" /> Registrar Abono
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {loadingPayments ? (
              <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-slate-300" /></div>
            ) : payments && payments.length > 0 ? (
              <div className="divide-y divide-slate-50">
                {payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-6 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-green-100 text-green-600 rounded-2xl">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-black text-slate-900 text-lg">{formatCurrency(p.amount)}</p>
                        <p className="text-xs text-slate-400 font-medium">
                          {p.date?.toDate ? p.date.toDate().toLocaleDateString('es-CO', { 
                            day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' 
                          }) : 'Fecha no disponible'}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="rounded-full border-green-200 text-green-600 bg-green-50 px-4 py-1">
                      Procesado
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <History className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-400 font-medium">No se han registrado abonos para este crédito aún.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}