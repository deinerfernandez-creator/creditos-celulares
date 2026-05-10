
"use client";

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardDescription 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Smartphone, 
  ChevronLeft, 
  PlusCircle, 
  Search, 
  Trash2, 
  Package,
  Loader2,
  Hash,
  DollarSign,
  Palette,
  TrendingUp
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
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
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

const formatCurrency = (value: any) => {
  const num = Number(value);
  if (isNaN(num)) return '$ 0';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(num);
};

export default function InventoryPage() {
  const router = useRouter();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form states
  const [newBrand, setNewBrand] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newImei, setNewImei] = useState('');
  const [newColor, setNewColor] = useState('');
  const [newCostPrice, setNewCostPrice] = useState('');
  const [newSalePrice, setNewSalePrice] = useState('');

  const phonesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'phones'), orderBy('brand', 'asc'));
  }, [db]);

  const { data: phones, isLoading } = useCollection(phonesQuery);

  const sortedPhones = useMemo(() => {
    if (!phones) return [];
    return [...phones].sort((a, b) => {
      const brandCmp = a.brand.localeCompare(b.brand);
      if (brandCmp !== 0) return brandCmp;
      return a.model.localeCompare(b.model);
    });
  }, [phones]);

  const filteredPhones = useMemo(() => {
    if (!sortedPhones) return [];
    if (!searchTerm) return sortedPhones;
    const term = searchTerm.toLowerCase();
    return sortedPhones.filter(p => 
      p.brand.toLowerCase().includes(term) || 
      p.model.toLowerCase().includes(term) ||
      (p.imei && p.imei.toLowerCase().includes(term)) ||
      (p.color && p.color.toLowerCase().includes(term))
    );
  }, [sortedPhones, searchTerm]);

  const handleAddPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrand || !newModel || !newImei) {
      toast({ title: "Error", description: "Marca, Modelo e IMEI son requeridos.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'phones'), {
        brand: newBrand,
        model: newModel,
        imei: newImei,
        color: newColor,
        costPrice: parseFloat(newCostPrice) || 0,
        salePrice: parseFloat(newSalePrice) || 0,
        createdAt: serverTimestamp()
      });
      toast({ title: "Equipo Registrado", description: `${newBrand} ${newModel} añadido al inventario.` });
      
      // Reset form
      setNewBrand('');
      setNewModel('');
      setNewImei('');
      setNewColor('');
      setNewCostPrice('');
      setNewSalePrice('');
    } catch (err: any) {
      toast({ title: "Error", description: "No se pudo registrar el equipo.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePhone = (id: string) => {
    deleteDocumentNonBlocking(doc(db, 'phones', id));
    toast({ title: "Equipo Eliminado", description: "El modelo ha sido removido del catálogo." });
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-body">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild className="rounded-full bg-white shadow-sm">
              <Link href="/"><ChevronLeft className="w-5 h-5" /></Link>
            </Button>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Inventario de Equipos</h1>
              <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Gestión de stock y rentabilidad</p>
            </div>
          </div>
          <Package className="w-8 h-8 text-primary opacity-20" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-1 border-none shadow-xl rounded-[2rem] h-fit">
            <CardHeader>
              <CardTitle className="text-lg font-black">Registrar Equipo</CardTitle>
              <CardDescription>Añadir nuevo terminal al sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddPhone} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-bold text-xs">Marca</Label>
                    <Input 
                      placeholder="Apple, Samsung" 
                      value={newBrand}
                      onChange={(e) => setNewBrand(e.target.value)}
                      className="rounded-xl h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-xs">Color</Label>
                    <div className="relative">
                      <Palette className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <Input 
                        placeholder="Negro, Azul" 
                        value={newColor}
                        onChange={(e) => setNewColor(e.target.value)}
                        className="rounded-xl h-10 pl-9"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="font-bold text-xs">Modelo</Label>
                  <Input 
                    placeholder="iPhone 15 Pro Max" 
                    value={newModel}
                    onChange={(e) => setNewModel(e.target.value)}
                    className="rounded-xl h-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-bold text-xs">IMEI</Label>
                  <Input 
                    placeholder="15 dígitos" 
                    value={newImei}
                    onChange={(e) => setNewImei(e.target.value)}
                    className="rounded-xl font-mono h-10"
                    maxLength={15}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-bold text-xs">Precio Costo (COP)</Label>
                    <Input 
                      type="number"
                      placeholder="0" 
                      value={newCostPrice}
                      onChange={(e) => setNewCostPrice(e.target.value)}
                      className="rounded-xl h-10 bg-slate-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-xs">Precio Venta (COP)</Label>
                    <Input 
                      type="number"
                      placeholder="0" 
                      value={newSalePrice}
                      onChange={(e) => setNewSalePrice(e.target.value)}
                      className="rounded-xl h-10 bg-primary/5 border-primary/20 font-bold"
                    />
                  </div>
                </div>

                <Button type="submit" disabled={loading} className="w-full rounded-xl font-bold bg-primary h-12 shadow-lg shadow-primary/20">
                  {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <PlusCircle className="w-5 h-5 mr-2" />}
                  Añadir al Stock
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 border-none shadow-xl rounded-[2rem] overflow-hidden bg-white">
            <CardHeader className="border-b bg-slate-50/50 p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <CardTitle className="text-lg font-black flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-primary" /> Equipos en Stock
                </CardTitle>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    placeholder="Buscar marca, modelo o IMEI..." 
                    className="pl-10 rounded-xl h-10 text-xs"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-[10px] uppercase font-black tracking-widest text-slate-400">
                    <tr>
                      <th className="px-6 py-4">Equipo / IMEI</th>
                      <th className="px-4 py-4">Color</th>
                      <th className="px-4 py-4">Venta</th>
                      <th className="px-4 py-4">Ganancia</th>
                      <th className="px-6 py-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isLoading ? (
                      <tr><td colSpan={5} className="p-20 text-center"><Loader2 className="animate-spin inline-block text-slate-200" /></td></tr>
                    ) : filteredPhones.length > 0 ? (
                      filteredPhones.map((phone) => {
                        const profit = (phone.salePrice || 0) - (phone.costPrice || 0);
                        return (
                          <tr key={phone.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-5">
                              <p className="text-[9px] font-black text-primary uppercase tracking-widest mb-0.5">{phone.brand}</p>
                              <p className="font-black text-slate-900 leading-none">{phone.model}</p>
                              <p className="text-[10px] font-mono text-slate-400 mt-1 flex items-center gap-1">
                                <Hash className="w-3 h-3" /> {phone.imei}
                              </p>
                            </td>
                            <td className="px-4 py-5">
                              <Badge variant="outline" className="rounded-full text-[10px] font-bold capitalize">
                                {phone.color || '---'}
                              </Badge>
                            </td>
                            <td className="px-4 py-5">
                              <p className="font-black text-slate-900">{formatCurrency(phone.salePrice)}</p>
                            </td>
                            <td className="px-4 py-5">
                              <div className="flex items-center gap-2">
                                <TrendingUp className="w-3 h-3 text-green-500" />
                                <p className="font-black text-green-600">{formatCurrency(profit)}</p>
                              </div>
                            </td>
                            <td className="px-6 py-5 text-right">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 rounded-xl">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="rounded-2xl">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="font-black">¿Eliminar del Catálogo?</AlertDialogTitle>
                                    <AlertDialogDescription>Esto quitará el modelo de las opciones de crédito y venta definitiva.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel className="rounded-xl font-bold">Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeletePhone(phone.id)} className="bg-destructive text-white rounded-xl font-bold">Eliminar</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
                          No se han registrado equipos aún.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
