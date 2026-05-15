
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Smartphone,
  ChevronLeft,
  PlusCircle,
  Search,
  Trash2,
  Package,
  Loader2,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, deleteDocumentNonBlocking, initializeFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  const [newImeisText, setNewImeisText] = useState('');
  const [newCostPrice, setNewCostPrice] = useState('');
  const [newSalePrice, setNewSalePrice] = useState('');
  const [newImageFile, setNewImageFile] = useState<File | null>(null);

  // Add stock states
  const [addingStockId, setAddingStockId] = useState<string | null>(null);
  const [additionalImeisText, setAdditionalImeisText] = useState('');
  const [editCostPrice, setEditCostPrice] = useState('');
  const [editSalePrice, setEditSalePrice] = useState('');
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [isAddingStock, setIsAddingStock] = useState(false);

  const phonesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'phones'), orderBy('brand', 'asc'));
  }, [db]);

  const { data: phones, isLoading } = useCollection(phonesQuery);

  const sortedPhones = useMemo(() => {
    if (!phones) return [];
    return [...phones].sort((a, b) => {
      const brandCmp = (a.brand || '').localeCompare(b.brand || '');
      if (brandCmp !== 0) return brandCmp;
      return (a.model || '').localeCompare(b.model || '');
    });
  }, [phones]);

  const filteredPhones = useMemo(() => {
    if (!sortedPhones) return [];
    if (!searchTerm) return sortedPhones;
    const term = searchTerm.toLowerCase();
    return sortedPhones.filter(p =>
      (p.brand || '').toLowerCase().includes(term) ||
      (p.model || '').toLowerCase().includes(term) ||
      (p.imeis && p.imeis.some((i: string) => i.toLowerCase().includes(term)))
    );
  }, [sortedPhones, searchTerm]);

  const handleAddPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    const imeis = newImeisText.split('\n').map(i => i.trim()).filter(i => i !== '');

    if (!newBrand || !newModel || imeis.length === 0) {
      toast({ title: "Error", description: "Marca, Modelo y al menos un IMEI son requeridos.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      let imageUrl = '';
      if (newImageFile) {
        const storage = initializeFirebase().storage;
        const storageRef = ref(storage, `inventory/${Date.now()}_${newImageFile.name}`);
        await uploadBytes(storageRef, newImageFile);
        imageUrl = await getDownloadURL(storageRef);
      }

      await addDoc(collection(db, 'phones'), {
        brand: newBrand,
        model: newModel,
        imeis: imeis,
        quantity: imeis.length,
        costPrice: parseFloat(newCostPrice) || 0,
        salePrice: parseFloat(newSalePrice) || 0,
        ...(imageUrl && { imageUrl }),
        createdAt: serverTimestamp()
      });
      toast({ title: "Stock Registrado", description: `${newBrand} ${newModel} (${imeis.length} unidades) añadidas.` });

      // Reset form
      setNewBrand('');
      setNewModel('');
      setNewImeisText('');
      setNewCostPrice('');
      setNewSalePrice('');
      setNewImageFile(null);
    } catch (err: any) {
      toast({ title: "Error", description: "No se pudo registrar el stock.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePhone = (id: string) => {
    deleteDocumentNonBlocking(doc(db, 'phones', id));
    toast({ title: "Registro Eliminado", description: "El lote ha sido removido del catálogo." });
  };

  const handleAddStockToExisting = async (phone: any) => {
    const newImeis = additionalImeisText.split('\n').map(i => i.trim()).filter(i => i !== '');

    setIsAddingStock(true);
    try {
      const existingImeis = phone.imeis || [];
      const updatedImeis = [...existingImeis, ...newImeis];
      
      const newCost = parseFloat(editCostPrice);
      const newSale = parseFloat(editSalePrice);

      let newImageUrl = phone.imageUrl || '';
      if (editImageFile) {
        const storage = initializeFirebase().storage;
        const storageRef = ref(storage, `inventory/${Date.now()}_${editImageFile.name}`);
        await uploadBytes(storageRef, editImageFile);
        newImageUrl = await getDownloadURL(storageRef);
      }

      await updateDoc(doc(db, 'phones', phone.id), {
        imeis: updatedImeis,
        quantity: updatedImeis.length,
        ...( !isNaN(newCost) && { costPrice: newCost } ),
        ...( !isNaN(newSale) && { salePrice: newSale } ),
        ...( newImageUrl && { imageUrl: newImageUrl } )
      });
      
      toast({ title: "Stock Actualizado", description: `Se han actualizado los datos de ${phone.brand} ${phone.model}.` });
      setAddingStockId(null);
      setAdditionalImeisText('');
      setEditImageFile(null);
    } catch (err: any) {
      toast({ title: "Error", description: "No se pudo actualizar el stock.", variant: "destructive" });
    } finally {
      setIsAddingStock(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-body">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild className="rounded-full bg-white shadow-sm">
              <Link href="/dashboard"><ChevronLeft className="w-5 h-5" /></Link>
            </Button>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Gestión de Stock e Inventario</h1>
              <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Control de IMEIs y existencias</p>
            </div>
          </div>
          <Package className="w-8 h-8 text-primary opacity-20" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-1 border-none shadow-xl rounded-[2rem] h-fit">
            <CardHeader>
              <CardTitle className="text-lg font-black">Cargar Nuevo Lote</CardTitle>
              <CardDescription>Ingresa los equipos y sus IMEIs correspondientes</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddPhone} className="space-y-4">
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
                  <Label className="font-bold text-xs">Modelo Comercial</Label>
                  <Input
                    placeholder="iPhone 15 Pro Max"
                    value={newModel}
                    onChange={(e) => setNewModel(e.target.value)}
                    className="rounded-xl h-10"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="font-bold text-xs">Listado de IMEIs</Label>
                    <span className="text-[9px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full">UNO POR LÍNEA</span>
                  </div>
                  <Textarea
                    placeholder="Ingresa cada IMEI en una línea diferente..."
                    value={newImeisText}
                    onChange={(e) => setNewImeisText(e.target.value)}
                    className="rounded-xl font-mono text-xs min-h-[120px] resize-none"
                  />
                  <p className="text-[9px] text-slate-400 font-bold italic">Se registrarán {newImeisText.split('\n').filter(i => i.trim() !== '').length} equipos en total.</p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="font-bold text-xs">Foto del Equipo</Label>
                    <span className="text-[9px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">OPCIONAL</span>
                  </div>
                  <Input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => setNewImageFile(e.target.files?.[0] || null)}
                    className="rounded-xl file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer h-auto text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-bold text-xs">Costo Unitario (COP)</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={newCostPrice}
                      onChange={(e) => setNewCostPrice(e.target.value)}
                      className="rounded-xl h-10 bg-slate-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-xs">Venta Unitario (COP)</Label>
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
                  Cargar al Inventario
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 border-none shadow-xl rounded-[2rem] overflow-hidden bg-white">
            <CardHeader className="border-b bg-slate-50/50 p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <CardTitle className="text-lg font-black flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-primary" /> Existencias en Tiempo Real
                </CardTitle>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Buscar por marca, modelo o IMEI..."
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
                      <th className="px-6 py-4">Equipo / Marca</th>
                      <th className="px-4 py-4 text-center">Stock</th>
                      <th className="px-4 py-4">Precio Venta</th>
                      <th className="px-4 py-4">Ganancia Est.</th>
                      <th className="px-6 py-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isLoading ? (
                      <tr><td colSpan={5} className="p-20 text-center"><Loader2 className="animate-spin inline-block text-slate-200" /></td></tr>
                    ) : filteredPhones.length > 0 ? (
                      filteredPhones.map((phone) => {
                        const profit = (phone.salePrice || 0) - (phone.costPrice || 0);
                        const isOutOfStock = !phone.imeis || phone.imeis.length === 0;
                        return (
                          <tr key={phone.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-3">
                                {phone.imageUrl ? (
                                  <img src={phone.imageUrl} alt={phone.model} className="w-10 h-10 rounded-xl object-cover bg-slate-100 shadow-sm shrink-0" />
                                ) : (
                                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm shrink-0">
                                    <Smartphone className="w-5 h-5" />
                                  </div>
                                )}
                                <div>
                                  <p className="text-[9px] font-black text-primary uppercase tracking-widest mb-0.5">{phone.brand}</p>
                                  <p className="font-black text-slate-900 leading-none">{phone.model}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-5 text-center">
                              <Badge variant={isOutOfStock ? "destructive" : "default"} className={`rounded-full px-3 font-black ${!isOutOfStock ? 'bg-green-500' : ''}`}>
                                {phone.imeis?.length || 0}
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
                              <div className="flex items-center justify-end gap-2">
                                <Dialog open={addingStockId === phone.id} onOpenChange={(open) => {
                                  if (open) {
                                    setAddingStockId(phone.id);
                                    setAdditionalImeisText('');
                                    setEditCostPrice(phone.costPrice?.toString() || '');
                                    setEditSalePrice(phone.salePrice?.toString() || '');
                                    setEditImageFile(null);
                                  } else {
                                    setAddingStockId(null);
                                  }
                                }}>
                                  <DialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="text-primary hover:bg-primary/10 rounded-xl">
                                      <PlusCircle className="w-4 h-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="rounded-2xl">
                                    <DialogHeader>
                                      <DialogTitle className="font-black">Editar / Añadir Stock: {phone.brand} {phone.model}</DialogTitle>
                                      <DialogDescription>
                                        Ingresa los nuevos IMEIs y/o actualiza los precios.
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="py-4 space-y-4">
                                      <div>
                                        <div className="flex justify-between items-center mb-2">
                                          <Label className="font-bold text-xs">Nuevos IMEIs</Label>
                                          <span className="text-[9px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full">OPCIONAL</span>
                                        </div>
                                        <Textarea 
                                          placeholder="Ingresa cada nuevo IMEI en una línea diferente..." 
                                          value={additionalImeisText}
                                          onChange={(e) => setAdditionalImeisText(e.target.value)}
                                          className="rounded-xl font-mono text-xs min-h-[80px] resize-none"
                                        />
                                        <p className="text-[9px] text-slate-400 font-bold italic mt-2">
                                          Se añadirán {additionalImeisText.split('\n').filter(i => i.trim() !== '').length} equipos. Stock actual: {phone.imeis?.length || 0}
                                        </p>
                                      </div>

                                      <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                          <Label className="font-bold text-xs">Costo Unitario (COP)</Label>
                                          <Input 
                                            type="number"
                                            placeholder="0" 
                                            value={editCostPrice}
                                            onChange={(e) => setEditCostPrice(e.target.value)}
                                            className="rounded-xl h-10 bg-slate-50"
                                          />
                                        </div>
                                        <div className="space-y-2">
                                          <Label className="font-bold text-xs">Venta Unitario (COP)</Label>
                                          <Input 
                                            type="number"
                                            placeholder="0" 
                                            value={editSalePrice}
                                            onChange={(e) => setEditSalePrice(e.target.value)}
                                            className="rounded-xl h-10 bg-primary/5 border-primary/20 font-bold"
                                          />
                                        </div>
                                      </div>

                                      <div className="space-y-2">
                                        <Label className="font-bold text-xs">Actualizar Foto del Equipo</Label>
                                        <Input 
                                          type="file" 
                                          accept="image/*"
                                          onChange={(e) => setEditImageFile(e.target.files?.[0] || null)}
                                          className="rounded-xl file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer h-auto text-xs"
                                        />
                                      </div>

                                      <div className="space-y-2 mt-4 pt-4 border-t">
                                        <Label className="font-bold text-xs">IMEIs Actuales ({phone.imeis?.length || 0})</Label>
                                        {phone.imeis && phone.imeis.length > 0 ? (
                                          <div className="max-h-32 overflow-y-auto space-y-1 bg-slate-50 p-2 rounded-xl border">
                                            {phone.imeis.map((imei: string, index: number) => (
                                              <div key={index} className="flex justify-between items-center text-xs font-mono bg-white p-1.5 rounded-lg shadow-sm">
                                                <span>{imei}</span>
                                                <Button 
                                                  type="button" 
                                                  variant="ghost" 
                                                  size="icon" 
                                                  className="h-6 w-6 text-destructive hover:bg-destructive/10"
                                                  onClick={async () => {
                                                    const updated = phone.imeis.filter((_: any, i: number) => i !== index);
                                                    await updateDoc(doc(db, 'phones', phone.id), { imeis: updated, quantity: updated.length });
                                                    toast({ title: "IMEI Eliminado", description: `Se ha retirado el IMEI ${imei} del inventario.` });
                                                  }}
                                                >
                                                  <Trash2 className="w-3 h-3" />
                                                </Button>
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <p className="text-xs text-slate-400 italic">No hay IMEIs registrados.</p>
                                        )}
                                      </div>
                                    </div>
                                    <DialogFooter>
                                      <Button variant="outline" onClick={() => setAddingStockId(null)} className="rounded-xl font-bold">Cancelar</Button>
                                      <Button 
                                        onClick={() => handleAddStockToExisting(phone)} 
                                        disabled={isAddingStock}
                                        className="rounded-xl font-bold bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                                      >
                                        {isAddingStock ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <PlusCircle className="w-4 h-4 mr-2" />}
                                        Guardar
                                      </Button>
                                    </DialogFooter>
                                  </DialogContent>
                                </Dialog>

                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 rounded-xl">
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent className="rounded-2xl">
                                    <AlertDialogHeader>
                                      <AlertDialogTitle className="font-black">¿Eliminar del Catálogo?</AlertDialogTitle>
                                      <AlertDialogDescription>Esto quitará este lote completo del inventario. Esta acción es definitiva.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel className="rounded-xl font-bold">Cancelar</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeletePhone(phone.id)} className="bg-destructive text-white rounded-xl font-bold">Eliminar Lote</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
                          No se han encontrado equipos con esos criterios.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-4">
          <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
          <p className="text-xs text-amber-800 font-medium leading-relaxed">
            <strong>Tip Pro:</strong> Al registrar un crédito o una venta a contado, podrás elegir uno de los IMEIs que hayas cargado aquí.
            El sistema restará automáticamente una unidad del stock una vez se complete la operación.
          </p>
        </div>
      </div>
    </div>
  );
}
