import Image from "next/image";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 font-sans antialiased overflow-x-hidden">
      
      {/* Dynamic Background Glows */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none -z-10" />

      {/* Header / Navigation Bar */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-slate-800/80 px-6 py-4 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-indigo-500 to-cyan-400 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-5 h-5 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
              </svg>
            </div>
            <div>
              <span className="font-sans font-extrabold text-xl tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                Tecnicell
              </span>
              <span className="text-cyan-400 font-bold text-sm ml-1">Ríoverde</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#catalogo" className="hover:text-white transition-colors">Catálogo</a>
            <a href="#credito" className="hover:text-white transition-colors">Solicitar Crédito</a>
            <a href="#beneficios" className="hover:text-white transition-colors">Beneficios</a>
            <a href="#sucursales" className="hover:text-white transition-colors">Sucursales</a>
          </nav>

          {/* Client Portal Button (Redirects to Ultranet Pro) */}
          <div>
            <a
              href="https://controlisp.tecnicellrioverde.com"
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-sm px-5 py-2.5 rounded-full transition-all hover:scale-[1.03] shadow-lg shadow-cyan-500/20"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
              </svg>
              Pagar Internet (Ultranet)
            </a>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto px-6 py-16 md:py-24">
        
        {/* HERO SECTION */}
        <section className="grid md:grid-cols-2 gap-12 items-center mb-24">
          <div className="space-y-6 text-center md:text-left">
            <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-4 py-1.5 rounded-full text-indigo-300 text-sm font-semibold tracking-wide">
              🔥 Aprobación Directa en 5 Minutos
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight md:leading-none text-white font-sans">
              Consigue el celular de tus sueños <span className="bg-gradient-to-r from-cyan-400 to-indigo-500 bg-clip-text text-transparent">A Crédito</span>
            </h1>
            <p className="text-slate-400 text-lg md:text-xl max-w-lg mx-auto md:mx-0">
              ¡Sin cuota inicial y sin trámites complejos! Estrena smartphone hoy mismo y págalo en cuotas cómodas semanales o quincenales.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <a
                href="https://wa.me/573116251841?text=Hola,%20quiero%20solicitar%20un%20celular%20a%20credito"
                target="_blank"
                className="inline-flex h-14 items-center justify-center px-8 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-lg shadow-indigo-600/30 hover:scale-[1.02]"
              >
                Solicitar por WhatsApp
              </a>
              <a
                href="#catalogo"
                className="inline-flex h-14 items-center justify-center px-8 rounded-full border border-slate-700 hover:bg-slate-800 text-slate-200 font-semibold transition-all hover:scale-[1.02]"
              >
                Ver Catálogo Celulares
              </a>
            </div>
          </div>

          {/* Graphic / Visual Representing Smartphone credits */}
          <div className="relative flex justify-center items-center">
            <div className="absolute w-[320px] h-[320px] bg-cyan-400/20 rounded-full blur-[80px] pointer-events-none -z-10" />
            <div className="relative bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl max-w-sm w-full space-y-6">
              <div className="flex justify-between items-start">
                <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Aprobado</span>
                <span className="text-slate-500 text-xs">Cupo disponible</span>
              </div>
              <div className="space-y-1">
                <div className="text-slate-400 text-sm">Crédito Pre-Aprobado</div>
                <div className="text-3xl font-extrabold text-white font-sans">$2.500.000 COP</div>
              </div>
              <div className="border-t border-slate-800 pt-4 space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Equipo:</span><span className="text-slate-200 font-medium">iPhone 15 Pro Max</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Cuota Semanal:</span><span className="text-slate-200 font-medium">$35.000 COP</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Inicial:</span><span className="text-cyan-400 font-bold">$0 pesos</span></div>
              </div>
              <a 
                href="https://wa.me/573116251841?text=Hola,%20quiero%20solicitar%20un%20celular%20a%20credito"
                className="w-full inline-flex h-12 items-center justify-center bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl transition-all"
              >
                ¡Reclamar Cupo Ahora!
              </a>
            </div>
          </div>
        </section>

        {/* INTEGRATION SECTION: ULTRANET PRO PORTAL */}
        <section className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-8 md:p-12 mb-24 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none -z-10" />
          <div className="max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 px-4 py-1 rounded-full text-cyan-300 text-xs font-bold uppercase tracking-wider">
              Servicio al Cliente
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white font-sans">
              ¿Eres cliente de Internet de <span className="bg-gradient-to-r from-cyan-400 to-indigo-500 bg-clip-text text-transparent font-extrabold">Ultranet Pro</span>?
            </h2>
            <p className="text-slate-400 text-lg">
              Accede de forma segura y directa a tu portal privado para verificar tus facturas, descargar tu estado de cuenta actual, monitorear la señal de tu conexión en caliente e informar de cualquier falla técnica de soporte.
            </p>
            <div className="pt-4 flex flex-wrap gap-4">
              <a
                href="https://controlisp.tecnicellrioverde.com"
                className="inline-flex h-12 items-center justify-center px-6 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-all shadow-lg shadow-cyan-500/20"
              >
                Ingresar al Portal del Cliente
              </a>
              <a
                href="https://controlisp.tecnicellrioverde.com#router"
                className="inline-flex h-12 items-center justify-center px-6 rounded-full border border-slate-800 bg-slate-950/50 hover:bg-slate-800 text-slate-300 font-semibold transition-all"
              >
                Panel Administrador ISP
              </a>
            </div>
          </div>
        </section>

        {/* BENEFICIOS SECTION */}
        <section id="beneficios" className="mb-24 space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold text-white font-sans">¿Por qué elegir Tecnicell Ríoverde?</h2>
            <p className="text-slate-400 max-w-xl mx-auto">Te brindamos las mejores facilidades de financiamiento tecnológico con respaldo total.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-2xl space-y-4">
              <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white font-sans">Rapidez Increíble</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Olvídate del papeleo extenso. Tu crédito se aprueba en solo 5 minutos directamente en nuestras sucursales o vía online.
              </p>
            </div>
            
            <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-2xl space-y-4">
              <div className="w-12 h-12 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-xl flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white font-sans">0% Cuota Inicial</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Estrena el teléfono de gama alta o media que desees sin tener que pagar un abono inicial de apertura. ¡Te lo llevas gratis!
              </p>
            </div>

            <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-2xl space-y-4">
              <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white font-sans">Garantía Asegurada</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Todos nuestros equipos son originales, homologados en Colombia y cuentan con garantía oficial directa de marca por 1 año.
              </p>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 px-6 py-12 text-center text-sm text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-left">
            <div className="font-extrabold text-white text-base">Tecnicell Ríoverde</div>
            <div className="text-xs text-slate-500 mt-1">Celulares a Crédito y Proveedor de Internet Ultranet Pro</div>
          </div>
          <div>
            &copy; 2026 Tecnicell Ríoverde. Todos los derechos reservados.
          </div>
        </div>
      </footer>

    </div>
  );
}

