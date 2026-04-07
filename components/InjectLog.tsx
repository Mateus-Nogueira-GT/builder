"use client";

import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { Loader2, CheckCircle, AlertTriangle, XCircle, ExternalLink } from "lucide-react";

interface LogEntry {
  message: string;
  status: "running" | "success" | "warning" | "error";
  step?: string;
}

interface InjectLogProps {
  jobId: string;
  onComplete?: (success: boolean) => void;
}

export function InjectLog({ jobId, onComplete }: InjectLogProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [siteUrl, setSiteUrl] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const eventSource = new EventSource(`/api/inject/${jobId}`);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "log") {
        setLogs((prev) => [...prev, data]);
      }

      if (data.type === "complete") {
        setSiteUrl(data.siteUrl || null);
        setDone(true);
        onCompleteRef.current?.(true);
        eventSource.close();
      }

      if (data.type === "error") {
        setError(data.message);
        setDone(true);
        onCompleteRef.current?.(false);
        eventSource.close();
      }
    };

    eventSource.onerror = () => {
      setError("Conexão com o servidor perdida.");
      setDone(true);
      onCompleteRef.current?.(false);
      eventSource.close();
    };

    return () => eventSource.close();
  }, [jobId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {logs.map((log, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <StatusIcon status={log.status} />
              <span className={cn(
                log.status === "error" && "text-red-400",
                log.status === "warning" && "text-yellow-400",
                log.status === "success" && "text-emerald-400",
                log.status === "running" && "text-zinc-300"
              )}>
                {log.message}
              </span>
            </div>
          ))}

          {!done && (
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Processando...
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-400">
              <XCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {done && !error && (
        <div className="space-y-4">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-center space-y-3">
            <div className="flex justify-center">
              <CheckCircle className="h-8 w-8 text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold text-white">Loja criada com sucesso!</h3>
            <p className="text-sm text-zinc-400 max-w-md mx-auto">
              Seus produtos já foram adicionados. Para gerar o link público da sua loja, clique no botão abaixo e publique pelo editor do Wix.
            </p>
            {siteUrl && (
              <a
                href={siteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-6 py-2.5 text-sm font-bold text-black hover:bg-emerald-400 transition-colors"
              >
                Abrir Painel da Loja <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-4">
            <h4 className="text-sm font-semibold text-white">Para publicar sua loja:</h4>
            <div className="space-y-3">
              <div className="flex gap-3 items-start">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-black">1</div>
                <p className="text-sm text-zinc-400">Clique em <strong className="text-white">&quot;Abrir Painel da Loja&quot;</strong> acima</p>
              </div>
              <div className="flex gap-3 items-start">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-black">2</div>
                <p className="text-sm text-zinc-400">No painel do Wix, clique em <strong className="text-white">&quot;Editar Site&quot;</strong></p>
              </div>
              <div className="flex gap-3 items-start">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-black">3</div>
                <p className="text-sm text-zinc-400">No editor, clique em <strong className="text-white">&quot;Publicar&quot;</strong> no canto superior direito — isso gera o link público da sua loja</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: LogEntry["status"] }) {
  switch (status) {
    case "running":
      return <Loader2 className="mt-0.5 h-4 w-4 animate-spin text-blue-400" />;
    case "success":
      return <CheckCircle className="mt-0.5 h-4 w-4 text-emerald-400" />;
    case "warning":
      return <AlertTriangle className="mt-0.5 h-4 w-4 text-yellow-400" />;
    case "error":
      return <XCircle className="mt-0.5 h-4 w-4 text-red-400" />;
  }
}
