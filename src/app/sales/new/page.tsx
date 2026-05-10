
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
  Check, 
  Search,
  User as UserIcon,
  Package,
  Receipt
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';

export default function NewSalePage() {
  const router = useRouter();
  const { toast } = useToast();
  const db = useFirestore();
  
  const [loading, setLoading] = useState(false);
  const [customerId, setCustomerId] = useState('contado');
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

  const handleModelSelect = (val: string) => {
    setDeviceModel(val);
    const phone = inventoryPhones?.find(p => `${p.brand} ${p.model}` === val);
    if (phone?.imei) setImei(phone.imei);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceModel || !amount) {
      toast({ title: "Faltan datos", description: "El modelo y el monto son requeridos.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const selectedCustomer = customers?.find(c => c.id === customerId);
      await addDoc(collection(db, 'sales'), {
        customerId: customerId === 'contado' ? null : customerId,
        customerName: customerId === 'contado' ? 'Venta Directa' : selectedCustomer?.name,
        deviceModel,
        imei,
        amount: parseFloat(amount),
        date: serverTimestamp()
      });
      toast({ title: "Venta Registrada", description: "La venta a contado se ha guardado exitosamente." });
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
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Nueva Venta a Contado</h1>
            <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Pago inmediato sin financiamiento</p>
          </div>
        </div>

        <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden bg-white">
          <CardHeader className="bg-slate-900 text-white p-8">
            <CardTitle className="flex items-center gap-3">
              <Receipt className="w-6 h-6 text-accent" /> Datos de Venta
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
                  <Label className="font-bold">Equipo</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                      placeholder="Buscar modelo..." 
                      className="pl-10 rounded-xl h-12"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select onValueChange={handleModelSelect} value={deviceModel}>
                    <SelectTrigger className="rounded-xl h-12 bg-slate-50 font-bold">
                      <SelectValue placeholder="Seleccionar del inventario" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredModels.map(p => (
                        <SelectItem key={p.id} value={`${p.brand} ${p.model}`}>{p.brand} {p.model}</SelectItem>
                      ))}
                      {searchTerm && (
                        <SelectItem value={searchTerm}>Usar: "{searchTerm}"</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="font-bold">IMEI</Label>
                  <Input 
                    placeholder="15 dígitos" 
                    className="rounded-xl h-12 font-mono"
                    value={imei}
                    onChange={(e) => setImei(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-bold">Monto Total Recibido (COP)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-600" />
                  <Input 
                    type="number"
                    placeholder="Ej: 1500000"
                    className="pl-10 rounded-xl h-16 text-2xl font-black text-green-700 bg-green-50/20"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full h-16 rounded-2xl text-xl font-black bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20">
                {loading ? "Procesando..." : "Registrar Venta Directa"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
