
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
  AlertCircle,
  TrendingUp,
  Search,
  LogOut,
  Bell,
  Hash,
  ExternalLink,
  ShieldCheck,
  UserCheck,
  Loader2
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { useFirestore, useCollection, useUser, useAuth, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import Link from 'next/link';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { user, role, loading: authLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const db = useFirestore();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
    // Si es cliente, mandarlo al portal
    if (!authLoading && user && role === 'cliente') {
      router.push(`/portal/${user.uid}`);
    }
  }, [user, authLoading, router, role]);

  // Fetch real data from Firestore with proper memoization
  const customersQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'customers'), orderBy('createdAt', 'desc'));
  }, [db]);
  const { data: customers } = useCollection(customersQuery);

  const creditsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'credits'), orderBy('createdAt', 'desc'));
  }, [db]);
  const { data: credits } = useCollection(creditsQuery);

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  const isAdmin = role === 'admin';

  const stats = [
    { title: "Créditos Activos", value: credits ? credits.length.toString() : "0", icon: LayoutDashboard, color: "text-primary", bg: "bg-primary/10" },
    { title: "Clientes Totales", value: customers ? customers.length.toString() : "0", icon: Users, color: "text-accent", bg: "bg-accent/10" },
    { title: "Cuentas Atrasadas", value: credits ? credits.filter((c: any) => c.status === 'atrasado').length.toString() : "0", icon: AlertCircle, color: "text-destructive", bg: "bg-destructive/10" },
    { 
      title: "Recaudación Mes", 
      value: isAdmin ? "$4,520" : "Ver Admin", 
      icon: TrendingUp, 
      color: "text-green-600", 
      bg: "bg-green-100",
      hide: !isAdmin 
    },
  ];

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
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
                <Badge className="bg-white/20 hover:bg-white/30 border-none text-[10px] py-0">{isAdmin ? 'ADMIN' : 'VENDEDOR'}</Badge>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent className="px-3">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} className="rounded-lg h-11">
                  <LayoutDashboard className="w-5 h-5 mr-3" />
                  <span>Panel de Control</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={activeTab === 'customers'} onClick={() => setActiveTab('customers')} className="rounded-lg h-11">
                  <Users className="w-5 h-5 mr-3" />
                  <span>Clientes</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={activeTab === 'credits'} onClick={() => setActiveTab('credits')} className="rounded-lg h-11">
                  <CreditCard className="w-5 h-5 mr-3" />
                  <span>Créditos</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <div className="my-4 border-t border-sidebar-border/30 px-3 pt-4">
                <p className="text-[10px] font-bold text-sidebar-foreground/50 uppercase tracking-widest mb-2">Accesos Externos</p>
              </div>

              <SidebarMenuItem>
                <SidebarMenuButton asChild className="rounded-lg h-11 text-accent hover:text-accent">
                  <Link href="/portal">
                    <Smartphone className="w-5 h-5 mr-3" />
                    <span>Portal de Clientes</span>
                    <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-4">
            <div className="mb-4 px-2">
              <div className="flex items-center gap-2 p-3 bg-white/10 rounded-xl border border-white/5">
                <div className="bg-white/20 p-2 rounded-lg text-white">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold truncate text-white">{user.email?.split('@')[0]}</p>
                  <p className="text-[10px] opacity-60 text-white uppercase">{role}</p>
                </div>
              </div>
            </div>
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
                {activeTab === 'dashboard' ? 'Panel de Control' : activeTab === 'customers' ? 'Listado de Clientes' : 'Gestión de Créditos'}
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar cliente o crédito..." className="pl-10 w-64 bg-slate-50 border-none ring-offset-background" />
              </div>
              <Button size="icon" variant="ghost" className="rounded-full relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full border-2 border-white" />
              </Button>
            </div>
          </header>

          <main className="p-8 space-y-8 animate-in fade-in duration-500">
            {activeTab === 'dashboard' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {stats.map((stat, idx) => (
                    <Card key={idx} className={`border-none shadow-sm overflow-hidden group hover:shadow-md transition-all ${stat.hide ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color} transition-colors`}>
                            <stat.icon className="w-6 h-6" />
                          </div>
                          {stat.hide ? (
                             <Badge variant="outline" className="text-[10px] text-muted-foreground">Admin Only</Badge>
                          ) : (
                             <Badge variant="secondary" className="bg-slate-100 text-slate-500 font-normal">Hoy</Badge>
                          )}
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
                        <CardDescription>Ultimos movimientos de la semana</CardDescription>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setActiveTab('credits')}>
                        Ver todos
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead>Cliente</TableHead>
                            <TableHead>Equipo / IMEI</TableHead>
                            <TableHead>Saldo</TableHead>
                            <TableHead>Progreso</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {credits && credits.length > 0 ? (
                            credits.slice(0, 5).map((credit: any) => {
                              const customer = customers?.find((c: any) => c.id === credit.customerId);
                              const progress = ((credit.totalAmount - credit.remainingBalance) / credit.totalAmount) * 100;
                              return (
                                <TableRow key={credit.id} className="cursor-pointer group">
                                  <TableCell>
                                    <div className="font-medium">{customer?.name || 'Cliente'}</div>
                                    <div className="text-[10px] text-muted-foreground">{customer?.cedula}</div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="text-sm">{credit.deviceModel}</div>
                                    <div className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                                      <Hash className="w-2 h-2" /> {credit.imei}
                                    </div>
                                  </TableCell>
                                  <TableCell className="font-semibold">${credit.remainingBalance}</TableCell>
                                  <TableCell className="w-32">
                                    <Progress value={progress} className="h-2" />
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={credit.status === 'activo' ? 'default' : 'secondary'} className="rounded-full px-3">
                                      {credit.status}
                                    </Badge>
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
                              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground italic">
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
                          <TableHead>Email</TableHead>
                          <TableHead>Teléfono</TableHead>
                          <TableHead>Dirección</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customers && customers.length > 0 ? (
                          customers.map((c: any) => (
                            <TableRow key={c.id}>
                              <TableCell className="font-medium">{c.name}</TableCell>
                              <TableCell className="font-mono text-xs">{c.cedula}</TableCell>
                              <TableCell>{c.email || 'N/A'}</TableCell>
                              <TableCell>{c.phone}</TableCell>
                              <TableCell className="max-w-xs truncate">{c.address || 'N/A'}</TableCell>
                              <TableCell>
                                <Button variant="ghost" size="sm">Editar</Button>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground italic">
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

            {activeTab === 'credits' && (
               <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-2xl font-bold">Gestión de Créditos</h3>
                    <Button asChild className="rounded-xl shadow-md">
                      <Link href="/credits/new"><PlusCircle className="mr-2 h-4 w-4" /> Nuevo Crédito</Link>
                    </Button>
                  </div>
                  <Card className="border-none shadow-sm">
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Equipo / IMEI</TableHead>
                            <TableHead>Plan</TableHead>
                            <TableHead>Cuota</TableHead>
                            <TableHead>Saldo Restante</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {credits && credits.length > 0 ? (
                            credits.map((credit: any) => {
                              const customer = customers?.find((c: any) => c.id === credit.customerId);
                              return (
                                <TableRow key={credit.id}>
                                  <TableCell className="font-mono text-xs text-muted-foreground uppercase">{credit.id.slice(0, 5)}</TableCell>
                                  <TableCell>
                                    <div className="font-medium">{customer?.name || 'Cliente'}</div>
                                    <div className="text-[10px] text-muted-foreground">{customer?.cedula}</div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="text-sm">{credit.deviceModel}</div>
                                    <div className="text-[10px] font-mono text-muted-foreground">{credit.imei}</div>
                                  </TableCell>
                                  <TableCell>{credit.planType} Quincenas</TableCell>
                                  <TableCell className="font-semibold">${credit.installmentAmount}</TableCell>
                                  <TableCell className="font-bold text-primary">${credit.remainingBalance}</TableCell>
                                  <TableCell>
                                     <Badge className="rounded-full px-3">{credit.status}</Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Button variant="outline" size="sm" asChild>
                                      <Link href={`/credits/${credit.id}`}>Detalles</Link>
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              )
                            })
                          ) : (
                            <TableRow>
                              <TableCell colSpan={8} className="text-center py-8 text-muted-foreground italic">
                                No hay créditos registrados.
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
