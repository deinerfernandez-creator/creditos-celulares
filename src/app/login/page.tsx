
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, Mail, Lock, Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: "Sesión iniciada",
        description: "Bienvenido al panel de control.",
      });
      router.push('/');
    } catch (error: any) {
      toast({
        title: "Error de acceso",
        description: "Credenciales inválidas o sin permisos.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <Button variant="ghost" asChild className="rounded-xl text-slate-500">
          <Link href="/portal"><ArrowLeft className="w-4 h-4 mr-2" /> Ir al Portal de Clientes</Link>
        </Button>

        <Card className="border-none shadow-2xl rounded-3xl overflow-hidden">
          <CardHeader className="bg-primary text-white text-center pb-8">
            <div className="mx-auto bg-white/20 p-3 rounded-2xl w-fit mb-4">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <CardTitle className="text-2xl font-bold">Tecnicell Staff</CardTitle>
            <CardDescription className="text-white/70 italic">Acceso para administradores y vendedores</CardDescription>
          </CardHeader>
          <CardContent className="pt-8">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="usuario@tecnicell.com"
                    className="pl-10 h-12 rounded-xl"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="••••••••"
                    className="pl-10 h-12 rounded-xl"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full h-14 rounded-xl text-lg font-bold shadow-lg shadow-primary/20">
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Iniciar Sesión"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="bg-slate-50 p-6 text-center border-t">
            <p className="text-xs text-slate-500 w-full italic">
              Si olvidaste tu acceso, contacta al administrador del sistema.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
