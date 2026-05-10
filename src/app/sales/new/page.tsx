
"use client";

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Smartphone, 
  ChevronLeft, 
  DollarSign, 
  Search,
  Package,
  Receipt,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, doc, updateDoc, arrayRemove, increment } from 'firebase/firestore';

export default function NewSalePage() {
  const router = useRouter();
  const { toast } = useToast();
  const db = useFirestore();
  
  const [loading, setLoading] = useState(false);
  const [customerId, setCustomerId] = useState('contado');
  const [selectedInventoryId, setSelectedInventoryId] = useState<string | null>(null);
  const [deviceModel, setDeviceModel] = useState('');
  const [imei, setImei] = useState('');
  const [amount, setAmount] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const customersQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'customers'), orderBy('name', 'asc'));
  }, [db]);
  const { data: customers } = useCollection(customersQuery);

  const phonesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'phones'), orderBy('brand', 'asc'));
  }, [db]);
  const { data: inventoryPhones } = useCollection(phonesQuery);

  const filteredModels = useMemo(() => {
    if (!inventoryPhones) return [];
    return inventoryPhones.filter(p => 
      `${p.brand} ${p.model}`.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [inventoryPhones, searchTerm]);

  const handleInventorySelect = (id: string) => {
    const foundPhone = inventoryPhones?.find(p => p.id === id);
    if (foundPhone) {
      setSelectedInventoryId(id);
      setDeviceModel(`${foundPhone.brand} ${foundPhone.model}`);
      setAmount(foundPhone.salePrice.toString());
      setImei(''); // Reset imei to force pick from list
    }
  };

  const selectedPhoneData = useMemo(() => {
    if (!selectedInventoryId || !inventoryPhones) return null;
    return inventoryPhones.find(p => p.id === selectedInventoryId);
  }, [selectedInventoryId, inventoryPhones]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceModel || !amount || !imei) {
      toast({ title: "Faltan datos", description: "El equipo, IMEI y el monto son requeridos.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const selectedCustomer = customers?.find(c => c.id === customerId);
      
      // Registrar la venta
      await addDoc(collection(db, 'sales'), {
        customerId: customerId === 'contado' ? null : customerId,
        customerName: customerId === 'contado' ? 'Venta Directa' : selectedCustomer?.name,
        deviceModel,
        imei,
        amount: parseFloat(amount),
        date: serverTimestamp()
      });

      // Descontar del inventario si corresponde
      if (selectedInventoryId) {
        await updateDoc(doc(db, 'phones', selectedInventoryId), {
          imeis: arrayRemove(imei),
          quantity: increment(-1)
        });
      }

      toast({ title: "Venta Registrada", description: "La venta a contado se ha guardado y el stock actualizado." });
      router.push('/');
    } catch (err: any) {
      toast({ title: "Error", description: "No se pudo registrar la venta.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 flex items-center justify-center font-body">
      <div className="w-full max-w-2xl space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="rounded-full bg-white shadow-sm">
            <Link href="/"><ChevronLeft className="w-5 h-5" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Venta Directa a Contado</h1>
            <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Salida inmediata de inventario</p>
          </div>
        </div>

        <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden bg-white">
          <CardHeader className="bg-slate-900 text-white p-8">
            <CardTitle className="flex items-center gap-3">
              <Receipt className="w-6 h-6 text-accent" /> Datos de Transacción
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label className="font-bold">Cliente (Opcional)</Label>
                <Select onValueChange={setCustomerId} value={customerId}>
                  <SelectTrigger className="rounded-xl h-12 bg-slate-50">
                    <SelectValue placeholder="Selecciona un cliente o deja como contado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contado">Venta de Contado (Sin registro)</SelectItem>
                    {customers?.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name} ({c.cedula})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="font-bold">Equipo en Stock</Label>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                      placeholder="Filtrar inventario..." 
                      className="pl-10 rounded-xl h-10 text-xs"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select onValueChange={handleInventorySelect} value={selectedInventoryId || ''}>
                    <SelectTrigger className="rounded-xl h-12 bg-slate-50 font-bold">
                      <SelectValue placeholder="Seleccionar del inventario" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredModels.map(p => (
                        <SelectItem key={p.id} value={p.id} disabled={!p.imeis || p.imeis.length === 0}>
                          {p.brand} {p.model} - Stock: {p.imeis?.length || 0}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="font-bold">IMEI del Dispositivo</Label>
                  {selectedPhoneData && selectedPhoneData.imeis?.length > 0 ? (
                    <Select onValueChange={setImei} value={imei} required>
                      <SelectTrigger className="rounded-xl h-12 font-mono bg-slate-50">
                        <SelectValue placeholder="Elegir IMEI disponible..." />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedPhoneData.imeis.map((i: string) => (
                          <SelectItem key={i} value={i} className="font-mono">{i}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input 
                      placeholder="15 dígitos" 
                      className="rounded-xl h-12 font-mono bg-slate-50"
                      value={imei}
                      onChange={(e) => setImei(e.target.value)}
                      required
                    />
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-bold">Monto Total Recibido (COP)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-600" />
                  <Input 
                    type="number"
                    placeholder="Ej: 1500000"
                    className="pl-10 rounded-xl h-16 text-2xl font-black text-green-700 bg-green-50/20 border-green-100"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-primary shrink-0" />
                <p className="text-[10px] leading-relaxed text-slate-500 font-medium">
                  Al registrar esta venta, el IMEI seleccionado se retirará automáticamente del stock disponible.
                </p>
              </div>

              <Button type="submit" disabled={loading} className="w-full h-16 rounded-2xl text-xl font-black bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20">
                {loading ? "Procesando Venta..." : "Completar Venta Directa"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
