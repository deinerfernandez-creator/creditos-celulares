'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  SidebarProvider, 
  Sidebar, 
  SidebarContent, 
  SidebarHeader, 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton, 
  SidebarInset,
  SidebarTrigger,
  SidebarFooter
} from "@/components/ui/sidebar";
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  PlusCircle, 
  Smartphone, 
  TrendingUp,
  Search,
  LogOut,
  Bell,
  Hash,
  ExternalLink,
  ShieldCheck,
  UserCheck,
  Loader2,
  ShieldAlert,
  CheckCircle2,
  History
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { useFirestore, useCollection, useUser, useAuth, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value);
};

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mounted, setMounted] = useState(false);
  const { user, role, loading: authLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const db = useFirestore();
  const { toast } = useToast();
  
  const logo = PlaceHolderImages.find(img => img.id === 'logo-tecnicell');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !authLoading && !user) {
      router.push('/login');
    }
    if (mounted && !authLoading && user && role === 'cliente') {
      router.push('/portal');
    }
  }, [user, authLoading, router, role, mounted]);

  const customersQuery = useMemoFirebase(() => {
    if (!db || !mounted) return null;
    return query(collection(db, 'customers'), orderBy('createdAt', 'desc'));
  }, [db, mounted]);
  const { data: customers } = useCollection(customersQuery);

  const creditsQuery = useMemoFirebase(() => {
    if (!db || !mounted) return null;
    return query(collection(db, 'credits'), orderBy('createdAt', 'desc'));
  }, [db, mounted]);
  const { data: credits } = useCollection(creditsQuery);

  if (!mounted || authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  const isAdmin = role === 'admin';

  const stats = [
    { title: "Créditos Activos", value: credits ? credits.filter((c: any) => c.status === 'activo').length.toString() : "0", icon: LayoutDashboard, color: "text-primary", bg: "bg-primary/10" },
    { title: "Clientes Totales", value: customers ? customers.length.toString() : "0", icon: Users, color: "text-accent", bg: "bg-accent/10" },
    { title: "Equipos Bloqueados", value: credits ? credits.filter((c: any) => c.status === 'bloqueado').length.toString() : "0", icon: ShieldAlert, color: "text-destructive", bg: "bg-destructive/10" },
    { 
      title: "Pagos Completos", 
      value: credits ? credits.filter((c: any) => c.status === 'pagado').length.toString() : "0", 
      icon: CheckCircle2, 
      color: "text-green-600", 
      bg: "bg-green-100"
    },
  ];

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'activo':
        return <Badge className="bg-green-500 hover:bg-green-600 rounded-full px-3 capitalize font-bold">Activo</Badge>;
      case 'pagado':
        return <Badge className="bg-primary hover:bg-primary/90 rounded-full px-3 capitalize font-bold">Pagado</Badge>;
      case 'bloqueado':
        return <Badge variant="destructive" className="rounded-full px-3 capitalize font-bold">Bloqueado</Badge>;
      default:
        return <Badge variant="secondary" className="rounded-full px-3 capitalize font-bold">{status}</Badge>;
    }
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen w-full overflow-hidden bg-slate-50">
        <Sidebar className="border-r border-slate-200 shadow-2xl">
          <SidebarHeader className="p-6">
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 overflow-hidden rounded-2xl bg-white p-1 flex items-center justify-center shadow-lg border border-slate-100">
                <Image src={logo?.imageUrl || '/logo.png'} alt="Logo" width={32} height={32} />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tighter text-white">Tecnicell</h1>
                <Badge className="bg-white/20 hover:bg-white/30 border-none text-[10px] py-0 uppercase tracking-widest font-black">{role}</Badge>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent className="px-3 pt-4">
            <SidebarMenu>
              <SidebarMenuButton isActive={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} className="rounded-xl h-12 font-bold mb-1">
                <LayoutDashboard className="w-5 h-5 mr-3" />
                <span>Dashboard</span>
              </SidebarMenuButton>
              <SidebarMenuButton isActive={activeTab === 'customers'} onClick={() => setActiveTab('customers')} className="rounded-xl h-12 font-bold mb-1">
                <Users className="w-5 h-5 mr-3" />
                <span>Clientes</span>
              </SidebarMenuButton>
              <SidebarMenuButton isActive={activeTab === 'credits'} onClick={() => setActiveTab('credits')} className="rounded-xl h-12 font-bold mb-1">
                <CreditCard className="w-5 h-5 mr-3" />
                <span>Créditos</span>
              </SidebarMenuButton>
              
              <div className="my-6 border-t border-white/10 px-3 pt-6">
                <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-4">Vistas Públicas</p>
                <SidebarMenuButton asChild className="rounded-xl h-12 text-accent hover:text-accent font-bold">
                  <Link href="/portal">
                    <Smartphone className="w-5 h-5 mr-3" />
                    <span>Portal de Clientes</span>
                    <ExternalLink className="w-4 h-4 ml-auto opacity-50" />
                  </Link>
                </SidebarMenuButton>
              </div>
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-4 border-t border-white/10">
            <Button 
              variant="ghost" 
              onClick={handleLogout}
              className="w-full justify-start text-white hover:bg-white/10 rounded-xl h-12 font-bold"
            >
              <LogOut className="w-5 h-5 mr-3" />
              <span>Cerrar Sesión</span>
            </Button>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex-1 overflow-auto">
          <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b bg-white/80 backdrop-blur-md px-10">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="text-slate-500" />
              <div className="h-6 w-px bg-slate-200 mx-2" />
              <h2 className="text-xl font-black text-slate-900 tracking-tight capitalize">
                {activeTab === 'dashboard' ? 'Resumen General' : activeTab === 'customers' ? 'Mis Clientes' : 'Gestión Financiera'}
              </h2>
            </div>
            <div className="flex items-center gap-4">
               <div className="bg-slate-100 p-2 rounded-full text-slate-400">
                  <Bell className="w-5 h-5" />
               </div>
               <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-black text-xs">
                  {user.email?.charAt(0).toUpperCase()}
               </div>
            </div>
          </header>

          <main className="p-10 space-y-10">
            {activeTab === 'dashboard' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {stats.map((stat, idx) => (
                    <Card key={idx} className="border-none shadow-sm rounded-3xl overflow-hidden group hover:shadow-xl transition-all border border-slate-100">
                      <CardContent className="p-8">
                        <div className="flex items-center justify-between">
                          <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color} transition-colors`}>
                            <stat.icon className="w-7 h-7" />
                          </div>
                        </div>
                        <div className="mt-6">
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{stat.title}</p>
                          <h3 className="text-4xl font-black mt-1 text-slate-900 tracking-tighter">{stat.value}</h3>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <Card className="lg:col-span-2 border-none shadow-sm rounded-3xl border border-slate-100 overflow-hidden bg-white">
                    <CardHeader className="p-8 border-b border-slate-50 flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-lg font-black text-slate-900">Créditos Recientes</CardTitle>
                        <CardDescription className="text-xs font-medium">Últimos movimientos del sistema</CardDescription>
                      </div>
                      <Button variant="ghost" size="sm" asChild className="rounded-full text-primary font-bold">
                        <Link href="/credits">Ver todos</Link>
                      </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader className="bg-slate-50/50">
                          <TableRow className="hover:bg-transparent border-none">
                            <TableHead className="px-8 font-black uppercase text-[10px] tracking-widest text-slate-400">Cliente</TableHead>
                            <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Equipo / IMEI</TableHead>
                            <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Saldo Pendiente</TableHead>
                            <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Estado</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {credits && credits.length > 0 ? (
                            credits.slice(0, 5).map((credit: any) => {
                              const customer = customers?.find((c: any) => c.id === credit.customerId);
                              return (
                                <TableRow key={credit.id} className="cursor-pointer group hover:bg-slate-50 transition-all">
                                  <TableCell className="px-8">
                                    <div className="font-bold text-slate-900">{customer?.name || 'Cargando...'}</div>
                                    <div className="text-[10px] text-slate-400 font-medium">CC: {customer?.cedula}</div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="text-sm font-bold text-primary">{credit.deviceModel}</div>
                                    <div className="text-[10px] font-mono text-slate-400">
                                      {credit.imei}
                                    </div>
                                  </TableCell>
                                  <TableCell className="font-black text-slate-900">{formatCurrency(credit.remainingBalance)}</TableCell>
                                  <TableCell>
                                    {getStatusBadge(credit.status)}
                                  </TableCell>
                                  <TableCell className="pr-8 text-right">
                                    <Button variant="outline" size="sm" asChild className="rounded-xl font-bold h-9">
                                      <Link href={`/credits/${credit.id}`}>Detalles</Link>
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          ) : (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center py-20 text-slate-400 font-medium italic">
                                No se encontraron registros de créditos.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>

                  <Card className="border-none shadow-sm rounded-3xl border border-slate-100 bg-white">
                    <CardHeader className="p-8">
                      <CardTitle className="text-lg font-black text-slate-900">Gestión Rápida</CardTitle>
                      <CardDescription className="text-xs font-medium">Accesos directos de operación</CardDescription>
                    </CardHeader>
                    <CardContent className="px-8 space-y-4">
                      <Button className="w-full justify-start h-14 bg-primary hover:bg-primary/90 text-white rounded-2xl shadow-xl shadow-primary/20 transition-all font-bold" asChild>
                        <Link href="/credits/new">
                          <PlusCircle className="w-5 h-5 mr-3" />
                          Nueva Solicitud
                        </Link>
                      </Button>
                      <Button variant="outline" className="w-full justify-start h-14 border-slate-200 hover:bg-slate-50 rounded-2xl transition-all font-bold text-slate-600" asChild>
                        <Link href="/customers/new">
                          <Users className="w-5 h-5 mr-3 text-primary" />
                          Registrar Cliente
                        </Link>
                      </Button>
                      <div className="pt-4 border-t border-slate-50">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Ayuda al Cliente</p>
                        <Button variant="secondary" className="w-full justify-start h-12 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all font-bold text-slate-500" asChild>
                          <Link href="/portal" target="_blank">
                            <Smartphone className="w-4 h-4 mr-3" />
                            Ver Portal Público
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}

            {activeTab === 'customers' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="flex justify-between items-center">
                   <div>
                     <h3 className="text-3xl font-black text-slate-900 tracking-tight">Directorio de Clientes</h3>
                     <p className="text-sm text-slate-500 font-medium">Listado oficial de personas registradas en Tecnicell</p>
                   </div>
                   <Button asChild className="rounded-2xl h-12 px-6 font-bold shadow-lg shadow-primary/20">
                     <Link href="/customers/new"><PlusCircle className="mr-2 h-5 w-5" /> Nuevo Cliente</Link>
                   </Button>
                </div>
                <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white border border-slate-100">
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader className="bg-slate-50/50">
                        <TableRow className="border-none">
                          <TableHead className="px-8 font-black uppercase text-[10px] tracking-widest text-slate-400">Nombre Completo</TableHead>
                          <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Documento</TableHead>
                          <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Contacto</TableHead>
                          <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Crédito Actual</TableHead>
                          <TableHead className="pr-8 text-right font-black uppercase text-[10px] tracking-widest text-slate-400">Acción</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customers && customers.length > 0 ? (
                          customers.map((c: any) => {
                            const latestCredit = credits?.find((cr: any) => cr.customerId === c.id);
                            return (
                              <TableRow key={c.id} className="hover:bg-slate-50 border-slate-50 transition-all">
                                <TableCell className="px-8 font-bold text-slate-900">{c.name}</TableCell>
                                <TableCell className="font-mono text-xs text-slate-500">{c.cedula}</TableCell>
                                <TableCell className="text-sm font-medium text-primary">{c.phone}</TableCell>
                                <TableCell>
                                  {latestCredit ? getStatusBadge(latestCredit.status) : <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Sin Créditos</span>}
                                </TableCell>
                                <TableCell className="pr-8 text-right">
                                  <Button variant="ghost" size="sm" className="rounded-xl font-bold text-slate-400 hover:text-primary">Editar</Button>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-20 text-slate-400 font-medium italic">
                              No hay clientes registrados en el sistema.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            )}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}