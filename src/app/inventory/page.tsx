
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
  Hash
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

export default function InventoryPage() {
  const router = useRouter();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newBrand, setNewBrand] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newImei, setNewImei] = useState('');

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
      (p.imei && p.imei.toLowerCase().includes(term))
    );
  }, [sortedPhones, searchTerm]);

  const handleAddPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrand || !newModel || !newImei) {
      toast({ title: "Error", description: "Todos los campos (Marca, Modelo e IMEI) son requeridos.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'phones'), {
        brand: newBrand,
        model: newModel,
        imei: newImei,
        createdAt: serverTimestamp()
      });
      toast({ title: "Equipo Registrado", description: `${newBrand} ${newModel} añadido al inventario.` });
      setNewBrand('');
      setNewModel('');
      setNewImei('');
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
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild className="rounded-full bg-white shadow-sm">
              <Link href="/"><ChevronLeft className="w-5 h-5" /></Link>
            </Button>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Inventario de Equipos</h1>
              <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Catálogo de teléfonos disponibles</p>
            </div>
          </div>
          <Package className="w-8 h-8 text-primary opacity-20" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="md:col-span-1 border-none shadow-xl rounded-[2rem] h-fit">
            <CardHeader>
              <CardTitle className="text-lg font-black">Nuevo Modelo</CardTitle>
              <CardDescription>Añadir al catálogo de ventas</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddPhone} className="space-y-4">
                <div className="space-y-2">
                  <Label className="font-bold">Marca</Label>
                  <Input 
                    placeholder="Ejem: Apple, Samsung..." 
                    value={newBrand}
                    onChange={(e) => setNewBrand(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold">Modelo</Label>
                  <Input 
                    placeholder="Ejem: iPhone 15 Pro Max" 
                    value={newModel}
                    onChange={(e) => setNewModel(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold">IMEI</Label>
                  <Input 
                    placeholder="15 dígitos" 
                    value={newImei}
                    onChange={(e) => setNewImei(e.target.value)}
                    className="rounded-xl font-mono"
                    maxLength={15}
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full rounded-xl font-bold bg-primary">
                  {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <PlusCircle className="w-4 h-4 mr-2" />}
                  Registrar Equipo
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="md:col-span-2 border-none shadow-xl rounded-[2rem] overflow-hidden bg-white">
            <CardHeader className="border-b bg-slate-50/50 p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <CardTitle className="text-lg font-black flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-primary" /> Equipos en Sistema
                </CardTitle>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    placeholder="Buscar marca, modelo o IMEI..." 
                    className="pl-10 rounded-xl h-9 text-xs"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {isLoading ? (
                  <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-slate-200" /></div>
                ) : filteredPhones.length > 0 ? (
                  filteredPhones.map((phone) => (
                    <div key={phone.id} className="flex items-center justify-between p-6 hover:bg-slate-50/50 transition-colors">
                      <div>
                        <p className="text-[10px] font-black text-primary uppercase tracking-widest">{phone.brand}</p>
                        <p className="font-black text-slate-900 text-lg tracking-tight">{phone.model}</p>
                        {phone.imei && (
                          <p className="text-[10px] font-mono text-slate-400 mt-1 flex items-center gap-1">
                            <Hash className="w-3 h-3" /> IMEI: {phone.imei}
                          </p>
                        )}
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 rounded-xl">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-2xl">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="font-black">¿Eliminar del Catálogo?</AlertDialogTitle>
                            <AlertDialogDescription>Esto quitará el modelo de las opciones de crédito y cotización.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="rounded-xl font-bold">Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeletePhone(phone.id)} className="bg-destructive text-white rounded-xl font-bold">Eliminar</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ))
                ) : (
                  <div className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
                    No se han registrado equipos aún.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
