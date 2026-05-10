
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
  LogOut,
  ExternalLink,
  ShieldCheck,
  Loader2,
  ShieldAlert,
  CheckCircle2,
  Trash2,
  History,
  Shield,
  DollarSign as DollarIcon,
  Receipt,
  Search,
  Calculator,
  Package
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  useFirestore, 
  useCollection, 
  useUser, 
  useAuth, 
  useMemoFirebase,
  deleteDocumentNonBlocking
} from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value);
};

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
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
  }, [user, authLoading, router, mounted]);

  const customersQuery = useMemoFirebase(() => {
    if (!db || !mounted) return null;
    return query(collection(db, 'customers'));
  }, [db, mounted]);
  const { data: customersData } = useCollection(customersQuery);
  
  const customers = React.useMemo(() => {
    if (!customersData) return null;
    const sorted = [...customersData].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    if (!searchTerm) return sorted;
    return sorted.filter(c => 
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.cedula?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [customersData, searchTerm]);

  const creditsQuery = useMemoFirebase(() => {
    if (!db || !mounted) return null;
    return query(collection(db, 'credits'), orderBy('createdAt', 'desc'));
  }, [db, mounted]);
  const { data: creditsData, isLoading: loadingCredits } = useCollection(creditsQuery);

  const credits = React.useMemo(() => {
    if (!creditsData) return null;
    if (!searchTerm) return creditsData;
    return creditsData.filter(cr => {
      const customer = customersData?.find((c: any) => c.id === cr.customerId);
      return (
        customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        cr.deviceModel?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cr.imei?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [creditsData, customersData, searchTerm]);

  const handleDeleteCustomer = (id: string) => {
    if (role !== 'admin') return;
    deleteDocumentNonBlocking(doc(db, 'customers', id));
    toast({ title: "Cliente eliminado", description: "Los datos han sido removidos satisfactoriamente." });
  };

  const handleDeleteCredit = (id: string) => {
    if (role !== 'admin') return;
    deleteDocumentNonBlocking(doc(db, 'credits', id));
    toast({ title: "Crédito eliminado", description: "El expediente ha sido removido." });
  };

  if (!mounted || authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  const stats = [
    { title: "Créditos Activos", value: creditsData ? creditsData.filter((c: any) => c.status === 'activo').length.toString() : "0", icon: LayoutDashboard, color: "text-primary", bg: "bg-primary/10" },
    { title: "Clientes Totales", value: customersData ? customersData.length.toString() : "0", icon: Users, color: "text-accent", bg: "bg-accent/10" },
    { title: "Equipos Bloqueados", value: creditsData ? creditsData.filter((c: any) => c.status === 'bloqueado').length.toString() : "0", icon: ShieldAlert, color: "text-destructive", bg: "bg-destructive/10" },
    { title: "Pagos Completos", value: creditsData ? creditsData.filter((c: any) => c.status === 'pagado').length.toString() : "0", icon: CheckCircle2, color: "text-green-600", bg: "bg-green-100" },
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
        <Sidebar className="border-r border-primary/10">
          <SidebarHeader className="p-6">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 overflow-hidden rounded-xl bg-white p-1 shadow-sm flex items-center justify-center">
                <Image src={logo?.imageUrl || '/logo.png'} alt="Logo" width={24} height={24} />
              </div>
              <div>
                <h1 className="text-lg font-black tracking-tighter text-white">Tecnicell</h1>
                <Badge className="bg-accent border-none text-[8px] py-0 uppercase tracking-widest font-black text-white">{role}</Badge>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent className="px-3 pt-4">
            <SidebarMenu>
              <SidebarMenuButton isActive={activeTab === 'dashboard'} onClick={() => { setActiveTab('dashboard'); setSearchTerm(''); }} className="rounded-xl h-11 font-bold mb-1">
                <LayoutDashboard className="w-5 h-5 mr-3" />
                <span>Dashboard</span>
              </SidebarMenuButton>
              <SidebarMenuButton isActive={activeTab === 'customers'} onClick={() => { setActiveTab('customers'); setSearchTerm(''); }} className="rounded-xl h-11 font-bold mb-1">
                <Users className="w-5 h-5 mr-3" />
                <span>Clientes</span>
              </SidebarMenuButton>
              <SidebarMenuButton isActive={activeTab === 'credits'} onClick={() => { setActiveTab('credits'); setSearchTerm(''); }} className="rounded-xl h-11 font-bold mb-1">
                <CreditCard className="w-5 h-5 mr-3" />
                <span>Créditos</span>
              </SidebarMenuButton>
              <SidebarMenuButton isActive={activeTab === 'downpayments'} onClick={() => { setActiveTab('downpayments'); setSearchTerm(''); }} className="rounded-xl h-11 font-bold mb-1">
                <Receipt className="w-5 h-5 mr-3" />
                <span>Recaudos</span>
              </SidebarMenuButton>
              <SidebarMenuButton asChild className="rounded-xl h-11 font-bold mb-1">
                <Link href="/inventory">
                  <Package className="w-5 h-5 mr-3" />
                  <span>Inventario</span>
                </Link>
              </SidebarMenuButton>
              <SidebarMenuButton asChild className="rounded-xl h-11 font-bold mb-1">
                <Link href="/quotations">
                  <Calculator className="w-5 h-5 mr-3" />
                  <span>Cotizador</span>
                </Link>
              </SidebarMenuButton>
              
              {role === 'admin' && (
                <SidebarMenuButton isActive={activeTab === 'staff'} onClick={() => { setActiveTab('staff'); setSearchTerm(''); }} className="rounded-xl h-11 font-bold mb-1">
                  <Shield className="w-5 h-5 mr-3" />
                  <span>Usuarios</span>
                </SidebarMenuButton>
              )}
              
              <div className="my-6 border-t border-white/10 px-3 pt-6">
                <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-4">Acceso Público</p>
                <SidebarMenuButton asChild className="rounded-xl h-11 text-accent hover:text-accent font-bold">
                  <Link href="/portal" target="_blank">
                    <Smartphone className="w-5 h-5 mr-3" />
                    <span>Portal Clientes</span>
                    <ExternalLink className="w-4 h-4 ml-auto opacity-50" />
                  </Link>
                </SidebarMenuButton>
              </div>
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-4">
            <Button 
              variant="ghost" 
              onClick={handleLogout}
              className="w-full justify-start text-white hover:bg-white/10 rounded-xl font-bold"
            >
              <LogOut className="w-5 h-5 mr-3" />
              <span>Cerrar Sesión</span>
            </Button>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex-1 overflow-auto">
          <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-white/80 backdrop-blur-md px-8">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="text-primary" />
              <div className="h-6 w-px bg-slate-200 mx-2" />
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                {activeTab === 'dashboard' ? 'Resumen Ejecutivo' : activeTab === 'customers' ? 'Clientes' : activeTab === 'credits' ? 'Financiamientos' : activeTab === 'downpayments' ? 'Recaudos Iniciales' : 'Gestión de Usuarios'}
              </h2>
            </div>
          </header>

          <main className="p-8 space-y-8 animate-in fade-in duration-500">
            {activeTab === 'dashboard' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {stats.map((stat, idx) => (
                    <Card key={idx} className="border-none shadow-sm rounded-3xl overflow-hidden border border-slate-100 hover:shadow-md transition-all">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color}`}>
                            <stat.icon className="w-6 h-6" />
                          </div>
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.title}</p>
                        <h3 className="text-3xl font-black mt-1 text-slate-900 tracking-tighter">{stat.value}</h3>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <Card className="lg:col-span-2 border-none shadow-sm rounded-[2rem] border border-slate-100 overflow-hidden bg-white">
                    <CardHeader className="p-8 border-b border-slate-50 flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-lg font-black text-slate-900">Actividad Reciente</CardTitle>
                        <CardDescription className="text-xs font-medium">Créditos procesados últimamente</CardDescription>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setActiveTab('credits')} className="rounded-full text-primary font-bold">
                        Ver todo
                      </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-slate-50/50 text-[10px] uppercase font-black tracking-widest text-slate-400">
                            <tr>
                              <th className="px-8 py-4">Cliente</th>
                              <th className="px-4 py-4">Equipo / IMEI</th>
                              <th className="px-4 py-4">Saldo</th>
                              <th className="px-4 py-4">Estado</th>
                              <th className="px-8 py-4 text-right">Acción</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {loadingCredits ? (
                              <tr>
                                <td colSpan={5} className="text-center py-20"><Loader2 className="animate-spin inline-block mr-2" /> Cargando...</td>
                              </tr>
                            ) : creditsData && creditsData.length > 0 ? (
                              creditsData.slice(0, 5).map((credit: any) => {
                                const customer = customersData?.find((c: any) => c.id === credit.customerId);
                                return (
                                  <tr key={credit.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-8 py-4">
                                      <div className="font-bold text-slate-900">{customer?.name || '---'}</div>
                                    </td>
                                    <td className="px-4 py-4">
                                      <div className="text-sm font-bold text-primary">{credit.deviceModel}</div>
                                      <div className="text-[10px] font-mono text-slate-400">{credit.imei}</div>
                                    </td>
                                    <td className="px-4 py-4 font-black text-slate-900">{formatCurrency(credit.remainingBalance)}</td>
                                    <td className="px-4 py-4">{getStatusBadge(credit.status)}</td>
                                    <td className="px-8 py-4 text-right">
                                      <Button variant="outline" size="sm" asChild className="rounded-xl font-bold border-primary/20 text-primary">
                                        <Link href={`/credits/${credit.id}`}>Expediente</Link>
                                      </Button>
                                    </td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr>
                                <td colSpan={5} className="text-center py-20 text-slate-400 italic">No hay registros aún.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-none shadow-sm rounded-[2rem] border border-slate-100 bg-white p-2">
                    <CardHeader className="p-6">
                      <CardTitle className="text-base font-black">Accesos Directos</CardTitle>
                      <CardDescription className="text-xs">Operaciones rápidas de tienda</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 pt-0 space-y-4">
                      <Button className="w-full justify-start h-14 bg-primary hover:bg-primary/90 text-white rounded-2xl shadow-xl shadow-primary/20 font-bold" asChild>
                        <Link href="/credits/new">
                          <PlusCircle className="w-5 h-5 mr-3" />
                          Nueva Solicitud
                        </Link>
                      </Button>
                      <Button variant="outline" className="w-full justify-start h-14 border-slate-200 hover:bg-slate-50 rounded-2xl font-bold text-slate-600" asChild>
                        <Link href="/inventory">
                          <Package className="w-5 h-5 mr-3 text-primary" />
                          Gestionar Equipos
                        </Link>
                      </Button>
                      <Button variant="outline" className="w-full justify-start h-14 border-slate-200 hover:bg-slate-50 rounded-2xl font-bold text-slate-600" asChild>
                        <Link href="/quotations">
                          <Calculator className="w-5 h-5 mr-3 text-accent" />
                          Cotizador Rápido
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}

            {activeTab === 'customers' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                   <div className="flex w-full sm:w-auto items-center gap-3">
                     <div className="relative w-full sm:w-64">
                       <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                       <Input 
                        placeholder="Buscar cliente..." 
                        className="pl-10 rounded-xl"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                       />
                     </div>
                     <Button asChild className="rounded-2xl h-10 px-6 font-bold shadow-lg shadow-primary/10">
                       <Link href="/customers/new"><PlusCircle className="mr-2 h-4 w-4" /> Nuevo</Link>
                     </Button>
                   </div>
                </div>
                <Card className="border-none shadow-sm rounded-[2rem] overflow-hidden bg-white border border-slate-100">
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50/50 text-[10px] uppercase font-black tracking-widest text-slate-400">
                          <tr>
                            <th className="px-8 py-5">Nombre Completo</th>
                            <th className="px-4 py-5">Identificación (CC)</th>
                            <th className="px-4 py-5">Contacto Principal</th>
                            <th className="px-8 py-5 text-right">Gestión</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {customers && customers.length > 0 ? (
                            customers.map((c: any) => (
                                <tr key={c.id} className="hover:bg-slate-50/30 transition-colors">
                                  <td className="px-8 py-5 font-bold text-slate-900">{c.name}</td>
                                  <td className="px-4 py-5 font-mono text-xs text-slate-500">{c.cedula}</td>
                                  <td className="px-4 py-5 font-bold text-primary">{c.phone}</td>
                                  <td className="px-8 py-5 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      {role === 'admin' && (
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl">
                                              <Trash2 className="w-4 h-4" />
                                            </Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent className="rounded-2xl">
                                            <AlertDialogHeader>
                                              <AlertDialogTitle className="font-black">¿Eliminar Cliente?</AlertDialogTitle>
                                              <AlertDialogDescription>Esta acción borrará permanentemente los datos de {c.name}. Esta acción no se puede deshacer.</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                              <AlertDialogCancel className="rounded-xl font-bold">Cancelar</AlertDialogCancel>
                                              <AlertDialogAction onClick={() => handleDeleteCustomer(c.id)} className="bg-destructive text-white hover:bg-destructive/90 rounded-xl font-bold">Eliminar Cliente</AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )
                            )
                          ) : (
                            <tr>
                              <td colSpan={4} className="text-center py-20 text-slate-400">No hay resultados.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'credits' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                   <div className="flex w-full sm:w-auto items-center gap-3">
                     <div className="relative w-full sm:w-64">
                       <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                       <Input 
                        placeholder="Buscar por cliente o equipo..." 
                        className="pl-10 rounded-xl"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                       />
                     </div>
                     <Button asChild className="rounded-2xl h-10 px-6 font-bold shadow-lg shadow-primary/10">
                       <Link href="/credits/new"><PlusCircle className="mr-2 h-4 w-4" /> Nueva</Link>
                     </Button>
                   </div>
                </div>
                <Card className="border-none shadow-sm rounded-[2rem] overflow-hidden bg-white border border-slate-100">
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50/50 text-[10px] uppercase font-black tracking-widest text-slate-400">
                          <tr>
                            <th className="px-8 py-5">Titular / Modelo</th>
                            <th className="px-4 py-5">IMEI</th>
                            <th className="px-4 py-5">Saldo</th>
                            <th className="px-4 py-5">Estado</th>
                            <th className="px-8 py-5 text-right">Gestión</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {credits && credits.length > 0 ? (
                            credits.map((cr: any) => {
                              const customer = customersData?.find((c: any) => c.id === cr.customerId);
                              return (
                                <tr key={cr.id} className="hover:bg-slate-50/30 transition-colors">
                                  <td className="px-8 py-5">
                                    <div className="font-bold text-slate-900">{customer?.name || '---'}</div>
                                    <div className="text-[10px] text-primary font-black uppercase">{cr.deviceModel}</div>
                                  </td>
                                  <td className="px-4 py-5 font-mono text-xs text-slate-500">{cr.imei}</td>
                                  <td className="px-4 py-5 font-black text-slate-900">{formatCurrency(cr.remainingBalance)}</td>
                                  <td className="px-4 py-5">{getStatusBadge(cr.status)}</td>
                                  <td className="px-8 py-5 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      <Button variant="outline" size="sm" asChild className="rounded-xl font-bold border-primary/20 text-primary">
                                        <Link href={`/credits/${cr.id}`}>Expediente</Link>
                                      </Button>
                                      {role === 'admin' && (
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 rounded-xl">
                                              <Trash2 className="w-4 h-4" />
                                            </Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent className="rounded-2xl">
                                            <AlertDialogHeader>
                                              <AlertDialogTitle className="font-black">¿Eliminar Crédito?</AlertDialogTitle>
                                              <AlertDialogDescription>Esta acción borrará el expediente permanentemente.</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                              <AlertDialogCancel className="rounded-xl font-bold">Cancelar</AlertDialogCancel>
                                              <AlertDialogAction onClick={() => handleDeleteCredit(cr.id)} className="bg-destructive text-white rounded-xl font-bold">Eliminar</AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={5} className="text-center py-20 text-slate-400">Sin resultados.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'downpayments' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                    placeholder="Buscar por cliente..." 
                    className="pl-10 rounded-xl"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <Card className="border-none shadow-sm rounded-[2rem] overflow-hidden bg-white border border-slate-100">
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50/50 text-[10px] uppercase font-black tracking-widest text-slate-400">
                          <tr>
                            <th className="px-8 py-5">Fecha / Cliente</th>
                            <th className="px-4 py-5">Equipo</th>
                            <th className="px-4 py-5">Cuota Inicial</th>
                            <th className="px-8 py-5 text-right">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {credits && credits.length > 0 ? (
                            credits.map((cr: any) => {
                              const customer = customersData?.find((c: any) => c.id === cr.customerId);
                              const date = cr.createdAt?.toDate ? cr.createdAt.toDate().toLocaleDateString('es-CO') : '---';
                              return (
                                <tr key={cr.id} className="hover:bg-slate-50/30 transition-colors">
                                  <td className="px-8 py-5">
                                    <div className="text-[10px] font-black text-slate-400 uppercase">{date}</div>
                                    <div className="font-bold text-slate-900">{customer?.name || '---'}</div>
                                  </td>
                                  <td className="px-4 py-5 font-bold text-primary">{cr.deviceModel}</td>
                                  <td className="px-4 py-5">
                                    <span className="font-black text-slate-900 text-lg">{formatCurrency(cr.downPayment)}</span>
                                  </td>
                                  <td className="px-8 py-5 text-right">
                                    <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-none rounded-full px-4 font-black text-[9px]">PAGO RECIBIDO</Badge>
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={4} className="text-center py-20 text-slate-400">Sin recaudos.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
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
