'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Smartphone, 
  ShieldCheck, 
  Calculator, 
  Users, 
  ChevronRight,
  Sparkles,
  CheckCircle2,
  Phone,
  Wifi
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function WelcomePage() {
  const router = useRouter();
  const logo = PlaceHolderImages.find(img => img.id === 'logo-tecnicell');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-body antialiased">
      {/* Header */}
      <header className="w-full bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100 px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 overflow-hidden rounded-2xl bg-white border border-slate-100 p-1.5 flex items-center justify-center shadow-sm">
            <Image 
              src={logo?.imageUrl || '/logo.png'} 
              alt="Tecnicell Logo" 
              width={32} 
              height={32}
              className="object-contain"
            />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter text-primary leading-none">Tecnicell</h1>
            <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mt-0.5">Financiación Experta</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" asChild className="rounded-full font-bold text-cyan-600 border-cyan-200 hover:bg-cyan-50">
            <a href="http://157.250.207.133">Acceso Ultranet</a>
          </Button>
          <Button variant="ghost" size="sm" asChild className="rounded-full font-bold text-slate-500">
            <Link href="/login">Acceso Staff</Link>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 space-y-12 max-w-7xl mx-auto w-full">
        <div className="text-center space-y-6 animate-in fade-in slide-in-from-top-4 duration-1000">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full border border-primary/10">
            <Sparkles className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">El celular que quieres, como lo quieres</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter leading-[1.1]">
            Tu Crédito para Celular <br/> <span className="text-primary">Fácil y Rápido</span>
          </h2>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto font-medium">
            En Tecnicell te ayudamos a estrenar tecnología con planes de financiación a tu medida. 
            Sin trámites complicados y con entrega inmediata.
          </p>
        </div>

        {/* Action Buttons / Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 w-full animate-in fade-in zoom-in-95 duration-1000 delay-200">
          
          {/* Card 1: Cotizador */}
          <Card className="group relative border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-white hover:shadow-primary/20 transition-all hover:scale-[1.02]">
            <CardContent className="p-8 flex flex-col items-center text-center space-y-6">
              <div className="p-5 bg-accent/10 text-accent rounded-3xl group-hover:scale-110 transition-transform duration-500">
                <Calculator className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Cotizador</h3>
                <p className="text-xs text-slate-500 font-medium">Simula tu plan de pagos y descubre cuánto pagarás por tu nuevo equipo.</p>
              </div>
              <Button asChild className="w-full h-12 rounded-2xl bg-accent hover:bg-accent/90 text-white font-black text-sm shadow-xl shadow-accent/20">
                <Link href="/quotations">Simular mi Crédito <ChevronRight className="w-4 h-4 ml-1" /></Link>
              </Button>
            </CardContent>
          </Card>

          {/* Card 2: Portal Clientes (Highlight) */}
          <Card className="group relative border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-primary text-white hover:shadow-primary/40 transition-all hover:scale-[1.02] md:-translate-y-4">
            <CardContent className="p-8 flex flex-col items-center text-center space-y-6">
              <div className="p-5 bg-white/10 rounded-3xl group-hover:scale-110 transition-transform duration-500">
                <Smartphone className="w-10 h-10 text-accent" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black tracking-tight">Portal Clientes</h3>
                <p className="text-xs text-white/70 font-medium">Consulta tu saldo, historial de abonos y fechas de pago en tiempo real.</p>
              </div>
              <Button asChild className="w-full h-12 rounded-2xl bg-white text-primary hover:bg-slate-50 font-black text-sm shadow-xl">
                <Link href="/portal">Entrar al Portal <ChevronRight className="w-4 h-4 ml-1" /></Link>
              </Button>
            </CardContent>
          </Card>

          {/* Card 3: Administración */}
          <Card className="group relative border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-slate-900 text-white hover:shadow-slate-900/40 transition-all hover:scale-[1.02]">
            <CardContent className="p-8 flex flex-col items-center text-center space-y-6">
              <div className="p-5 bg-white/5 rounded-3xl group-hover:scale-110 transition-transform duration-500 text-primary">
                <ShieldCheck className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black tracking-tight">Administración</h3>
                <p className="text-xs text-slate-400 font-medium">Acceso exclusivo para el personal de Tecnicell (Ventas y Gestión).</p>
              </div>
              <Button asChild variant="outline" className="w-full h-12 rounded-2xl border-white/20 bg-transparent hover:bg-white/5 text-white font-black text-sm">
                <Link href="/login">Acceso Panel Staff <ChevronRight className="w-4 h-4 ml-1" /></Link>
              </Button>
            </CardContent>
          </Card>

          {/* Card 4: Portal Internet (Ultranet) */}
          <Card className="group relative border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-gradient-to-br from-indigo-900 to-cyan-950 text-white hover:shadow-indigo-500/20 transition-all hover:scale-[1.02]">
            {/* Ambient Glow */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-400/10 rounded-full blur-xl pointer-events-none" />
            <CardContent className="p-8 flex flex-col items-center text-center space-y-6">
              <div className="p-5 bg-cyan-400/10 text-cyan-400 rounded-3xl group-hover:scale-110 transition-transform duration-500 border border-cyan-400/20">
                <Wifi className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black tracking-tight">Acceso Ultranet</h3>
                <p className="text-xs text-cyan-200/60 font-medium">Paga tu Internet Ultranet, descarga tu factura y reporta fallas de soporte.</p>
              </div>
              <Button asChild className="w-full h-12 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-sm shadow-xl shadow-cyan-500/20">
                <a href="http://157.250.207.133">Entrar a Ultranet <ChevronRight className="w-4 h-4 ml-1" /></a>
              </Button>
            </CardContent>
          </Card>

        </div>

        {/* Features */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full pt-12">
          {[
            { icon: CheckCircle2, text: "Entrega Inmediata" },
            { icon: CheckCircle2, text: "Sin Papeleos" },
            { icon: CheckCircle2, text: "Garantía Real" },
            { icon: CheckCircle2, text: "Pago Digital" }
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 justify-center p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
              <item.icon className="w-4 h-4 text-green-500 shrink-0" />
              <span className="text-[10px] font-black uppercase text-slate-600 tracking-wider">{item.text}</span>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-12 px-6 bg-white border-t border-slate-100">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col items-center md:items-start gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 relative opacity-50">
                 <Image src={logo?.imageUrl || '/logo.png'} alt="Logo" fill className="object-contain" />
              </div>
              <span className="font-black text-slate-400 tracking-tighter uppercase">Tecnicell Créditos</span>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">SANTA FE LAS CLARAS (RIO VERDE) CORDOBA COLOMBIA</p>
          </div>
          
          <div className="flex gap-4">
             <Button variant="outline" size="icon" className="rounded-xl border-slate-200" asChild>
                <a href="https://wa.me/573009823029" target="_blank"><Phone className="w-4 h-4 text-primary" /></a>
             </Button>
          </div>

          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            © {new Date().getFullYear()} - Sistema de Gestión Financiera
          </p>
        </div>
      </footer>
    </div>
  );
}
