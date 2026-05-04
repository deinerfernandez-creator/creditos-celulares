'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Lock, Loader2, ArrowLeft, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import Image from 'next/image';
import { firebaseConfig } from '@/firebase/config';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const logo = PlaceHolderImages.find(img => img.id === 'logo-tecnicell');
  const isConfigMissing = !firebaseConfig.apiKey || firebaseConfig.apiKey === 'undefined' || firebaseConfig.apiKey === '';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isConfigMissing) {
      toast({
        title: "Configuración incompleta",
        description: "Falta la API Key de Firebase. Por favor, configúrala en el archivo src/firebase/config.ts",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: "Sesión iniciada",
        description: "Bienvenido al panel administrativo de Tecnicell.",
      });
      router.push('/');
    } catch (error: any) {
      console.error("Login Error:", error.code, error.message);
      
      let message = "Credenciales inválidas. Verifica tu correo y contraseña.";
      
      if (error.code === 'auth/invalid-api-key' || error.code === 'auth/network-request-failed') {
        message = "Error técnico: La API Key de Firebase no es válida o no hay conexión.";
      } else if (error.code === 'auth/user-not-found') {
        message = "El usuario no existe. Regístralo en la consola de Firebase.";
      } else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        message = "Correo o contraseña incorrectos.";
      } else if (error.code === 'auth/too-many-requests') {
        message = "Demasiados intentos fallidos. Intenta más tarde.";
      }

      toast({
        title: "Error de acceso",
        description: message,
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <Button variant="ghost" asChild className="rounded-xl text-slate-500 hover:text-primary">
          <Link href="/portal"><ArrowLeft className="w-4 h-4 mr-2" /> Volver al Portal de Clientes</Link>
        </Button>

        {isConfigMissing && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex gap-3 text-amber-800 text-sm mb-4 shadow-sm animate-pulse">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500" />
            <p><strong>Atención:</strong> No has configurado las credenciales de Firebase. El inicio de sesión no funcionará hasta que añadas tu API Key en <code>src/firebase/config.ts</code>.</p>
          </div>
        )}

        <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden">
          <CardHeader className="bg-primary text-white text-center pb-8 pt-10">
            <div className="mx-auto bg-white p-2 rounded-2xl w-24 h-24 mb-6 flex items-center justify-center shadow-xl">
              <Image 
                src={logo?.imageUrl || '/logo.png'} 
                alt="Tecnicell Logo" 
                width={70} 
                height={70}
                className="object-contain"
              />
            </div>
            <CardTitle className="text-3xl font-black text-white tracking-tighter">Tecnicell Créditos</CardTitle>
            <CardDescription className="text-white/80 italic font-medium">Panel Administrativo Staff</CardDescription>
          </CardHeader>
          <CardContent className="pt-8 px-8">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-black uppercase tracking-widest text-slate-400">Correo Electrónico</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="ejemplo@correo.com"
                    className="pl-10 h-12 rounded-xl bg-slate-50 border-slate-200"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" id="pass-label" className="text-xs font-black uppercase tracking-widest text-slate-400">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="••••••••"
                    className="pl-10 h-12 rounded-xl bg-slate-50 border-slate-200"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full h-14 rounded-2xl text-lg font-black shadow-xl shadow-primary/20 bg-primary text-white hover:bg-primary/90 transition-all">
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Iniciar Sesión"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="bg-slate-50 p-6 text-center border-t">
            <div className="space-y-2 w-full">
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-tighter">
                Sistema Experto de Gestión de Créditos
              </p>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
