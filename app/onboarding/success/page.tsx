"use client";

import { useEffect, useState, Suspense } from "react";
import { CheckCircle, MessageCircle } from "lucide-react";

function SuccessContent() {
  const [storeName, setStoreName] = useState("");

  useEffect(() => {
    const name = sessionStorage.getItem("pending_store_name") || "";
    setStoreName(name);
    // Limpa todos os dados de sessão do onboarding
    sessionStorage.removeItem("pending_store_id");
    sessionStorage.removeItem("pending_store_name");
    sessionStorage.removeItem("pending_template_url");
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4">
      <div className="mx-auto max-w-md text-center space-y-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10">
          <CheckCircle className="h-10 w-10 text-emerald-500" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white">Tudo pronto!</h1>
          {storeName && (
            <p className="text-emerald-400 font-medium">{storeName}</p>
          )}
        </div>

        <div className="space-y-3 text-zinc-400 text-sm leading-relaxed">
          <p>
            Sua loja foi criada e conectada com sucesso. Nossa equipe já recebeu
            todas as informações e vai configurar tudo para você.
          </p>
          <p>
            Em breve entraremos em contato para confirmar os detalhes e garantir
            que sua loja fique exatamente como você imaginou.
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-4 text-sm text-zinc-300">
          <MessageCircle className="h-4 w-4 text-emerald-500 shrink-0" />
          <span>
            Dúvidas? Fale com a gente pelo WhatsApp ou pelo suporte — estamos
            disponíveis para ajudar.
          </span>
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
