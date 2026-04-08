"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, Loader2 } from "lucide-react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const name = searchParams.get("name") || "Sua Loja";

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4">
      <div className="mx-auto max-w-md text-center space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
          <CheckCircle className="h-8 w-8 text-emerald-500" />
        </div>
        <h2 className="text-2xl font-bold text-white">Obrigado!</h2>
        <p className="text-zinc-400 text-sm">
          Sua loja <strong className="text-white">{name}</strong> foi registrada com sucesso.
          Nossa equipe entrará em contato em breve para finalizar a configuração.
        </p>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
