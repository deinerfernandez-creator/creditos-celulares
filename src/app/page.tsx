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
  CheckCircle2
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

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !authLoading && !user) {
      router.push('/login');
    }
    if (mounted && !authLoading && user && role === 'cliente') {
      router.push(`/portal/${user.uid}`);
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

  const staffQuery = useMemoFirebase(() => {
    if (!db || !mounted || role !== 'admin') return null;
    return query(collection(db, 'users'), orderBy('createdAt', 'desc'));
  }, [db, mounted, role]);
  const { data: staff } = useCollection(staffQuery);

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
      title: "Créditos Pagados", 
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
        return <Badge className="bg-green-500 hover:bg-green-600 rounded-full px-3 capitalize">Activo</Badge>;
      case 'pagado':
        return <Badge className="bg-primary hover:bg-primary/90 rounded-full px-3 capitalize">Pagado</Badge>;
      case 'bloqueado':
        return <Badge variant="destructive" className="rounded-full px-3 capitalize">Bloqueado</Badge>;
      default:
        return <Badge variant="secondary" className="rounded-full px-3 capitalize">{status}</Badge>;
    }
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <Sidebar className="border-r border-sidebar-border shadow-2xl">
          <SidebarHeader className="p-6">
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 overflow-hidden rounded-xl bg-white p-1 flex items-center justify-center shadow-sm text-primary font-bold">
                T
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white">Tecnicell</h1>
                <Badge className="bg-white/20 hover:bg-white/30 border-none text-[10px] py-0 uppercase tracking-tighter">{role}</Badge>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent className="px-3">
            <SidebarMenu>
              <SidebarMenuButton isActive={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} className="rounded-lg h-11">
                <LayoutDashboard className="w-5 h-5 mr-3" />
                <span>Panel de Control</span>
              </SidebarMenuButton>
              <SidebarMenuButton isActive={activeTab === 'customers'} onClick={() => setActiveTab('customers')} className="rounded-lg h-11">
                <Users className="w-5 h-5 mr-3" />
                <span>Clientes</span>
              </SidebarMenuButton>
              <SidebarMenuButton isActive={activeTab === 'credits'} onClick={() => setActiveTab('credits')} className="rounded-lg h-11">
                <CreditCard className="w-5 h-5 mr-3" />
                <span>Créditos</span>
              </SidebarMenuButton>
              
              {isAdmin && (
                <SidebarMenuButton isActive={activeTab === 'staff'} onClick={() => setActiveTab('staff')} className="rounded-lg h-11">
                  <ShieldCheck className="w-5 h-5 mr-3" />
                  <span>Personal</span>
                </SidebarMenuButton>
              )}
              
              <div className="my-4 border-t border-sidebar-border/30 px-3 pt-4">
                <p className="text-[10px] font-bold text-sidebar-foreground/50 uppercase tracking-widest mb-2">Accesos Externos</p>
              </div>

              <SidebarMenuButton asChild className="rounded-lg h-11 text-accent hover:text-accent">
                <Link href="/portal">
                  <Smartphone className="w-5 h-5 mr-3" />
                  <span>Portal de Clientes</span>
                  <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
                </Link>
              </SidebarMenuButton>
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-4">
            <Button 
              variant="ghost" 
              onClick={handleLogout}
              className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent rounded-lg h-11"
            >
              <LogOut className="w-5 h-5 mr-3" />
              <span>Cerrar Sesión</span>
            </Button>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex-1 overflow-auto">
          <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-white/80 backdrop-blur-md px-8">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="text-muted-foreground" />
              <div className="h-6 w-px bg-border mx-2" />
              <h2 className="text-lg font-semibold capitalize">
                {activeTab === 'dashboard' ? 'Panel de Control' : activeTab === 'customers' ? 'Listado de Clientes' : activeTab === 'credits' ? 'Gestión de Créditos' : 'Gestión de Personal'}
              </h2>
            </div>
          </header>

          <main className="p-8 space-y-8">
            {activeTab === 'dashboard' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {stats.map((stat, idx) => (
                    <Card key={idx} className="border-none shadow-sm overflow-hidden group hover:shadow-md transition-all">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color} transition-colors`}>
                            <stat.icon className="w-6 h-6" />
                          </div>
                          <Badge variant="secondary" className="bg-slate-100 text-slate-500 font-normal">Hoy</Badge>
                        </div>
                        <div className="mt-4">
                          <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                          <h3 className="text-2xl font-bold mt-1">{stat.value}</h3>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <Card className="lg:col-span-2 border-none shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">Créditos Recientes</CardTitle>
                        <CardDescription>Ultimos movimientos del sistema</CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead>Cliente</TableHead>
                            <TableHead>Equipo / IMEI</TableHead>
                            <TableHead>Saldo</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {credits && credits.length > 0 ? (
                            credits.slice(0, 5).map((credit: any) => {
                              const customer = customers?.find((c: any) => c.id === credit.customerId);
                              return (
                                <TableRow key={credit.id} className="cursor-pointer group">
                                  <TableCell>
                                    <div className="font-medium">{customer?.name || 'Cargando...'}</div>
                                    <div className="text-[10px] text-muted-foreground">{customer?.cedula}</div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="text-sm">{credit.deviceModel}</div>
                                    <div className="text-[10px] font-mono text-muted-foreground">
                                      {credit.imei}
                                    </div>
                                  </TableCell>
                                  <TableCell className="font-semibold">{formatCurrency(credit.remainingBalance)}</TableCell>
                                  <TableCell>
                                    {getStatusBadge(credit.status)}
                                  </TableCell>
                                  <TableCell>
                                    <Button variant="outline" size="sm" asChild>
                                      <Link href={`/credits/${credit.id}`}>Ver</Link>
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          ) : (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground italic">
                                No hay créditos registrados.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>

                  <Card className="border-none shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-lg">Acciones Rápidas</CardTitle>
                      <CardDescription>Accesos directos comunes</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Button className="w-full justify-start h-12 bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg shadow-primary/20" asChild>
                        <Link href="/credits/new">
                          <PlusCircle className="w-5 h-5 mr-3" />
                          Nuevo Crédito
                        </Link>
                      </Button>
                      <Button variant="outline" className="w-full justify-start h-12 border-slate-200 hover:bg-slate-50 rounded-xl" asChild>
                        <Link href="/customers/new">
                          <Users className="w-5 h-5 mr-3 text-primary" />
                          Registrar Cliente
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}

            {activeTab === 'customers' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                   <h3 className="text-2xl font-bold">Clientes</h3>
                   <Button asChild className="rounded-xl shadow-md">
                     <Link href="/customers/new"><PlusCircle className="mr-2 h-4 w-4" /> Nuevo Cliente</Link>
                   </Button>
                </div>
                <Card className="border-none shadow-sm">
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nombre</TableHead>
                          <TableHead>Cédula</TableHead>
                          <TableHead>Teléfono</TableHead>
                          <TableHead>Estado Crédito</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customers && customers.length > 0 ? (
                          customers.map((c: any) => {
                            const latestCredit = credits?.find((cr: any) => cr.customerId === c.id);
                            return (
                              <TableRow key={c.id}>
                                <TableCell className="font-medium">{c.name}</TableCell>
                                <TableCell className="font-mono text-xs">{c.cedula}</TableCell>
                                <TableCell>{c.phone}</TableCell>
                                <TableCell>
                                  {latestCredit ? getStatusBadge(latestCredit.status) : <span className="text-xs text-muted-foreground">Sin crédito</span>}
                                </TableCell>
                                <TableCell>
                                  <Button variant="ghost" size="sm">Editar</Button>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground italic">
                              No hay clientes registrados.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            )}
            
            {/* Otros tabs similares con manejo de mounted */}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}