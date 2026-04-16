"use client";

import { useEffect, useState, Suspense } from "react";
import { CheckCircle, PlayCircle, HeadphonesIcon } from "lucide-react";

function SuccessContent() {
  const [storeName, setStoreName] = useState("");

  useEffect(() => {
    const name = sessionStorage.getItem("pending_store_name") || "";
    setStoreName(name);
    sessionStorage.removeItem("pending_store_id");
    sessionStorage.removeItem("pending_store_name");
    sessionStorage.removeItem("pending_template_url");
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4 py-12">
      <div className="mx-auto max-w-lg text-center space-y-8">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10">
          <CheckCircle className="h-10 w-10 text-emerald-500" />
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-white">Parabéns!</h1>
          {storeName && (
            <p className="text-emerald-400 font-medium">{storeName}</p>
          )}
          <p className="text-zinc-400 text-sm leading-relaxed">
            Você acaba de receber sua loja pré-montada na Plataforma Wix.
            Assista à aula abaixo para configurar sua loja com todos os recursos
            que a Plataforma Wix te oferece.
          </p>
        </div>

        <a
          href="https://www.wix.com/academiadenegocios/post/criando-uma-loja-virtual-do-zero"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 text-left hover:bg-emerald-500/20 transition-colors"
        >
          <PlayCircle className="h-6 w-6 text-emerald-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-300">Assistir aula</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              Criando uma loja virtual do zero — Wix Academia de Negócios
            </p>
          </div>
        </a>

        <div className="space-y-3">
          <p className="text-zinc-500 text-xs">Se precisar de mais ajuda ou suporte acesse:</p>
          <a
            href="https://support.wix.com/pt"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-4 text-left hover:border-zinc-700 transition-colors"
          >
            <HeadphonesIcon className="h-5 w-5 text-zinc-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-zinc-300">Suporte Wix</p>
              <p className="text-xs text-zinc-600 mt-0.5">support.wix.com/pt</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
      <SuccessContent />
    </Suspense>
  );
}
