'use client';

import { useState, useRef, useCallback } from 'react';
import {
  Syringe,
  AlertTriangle,
  Search,
  Upload,
  Loader2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  RotateCcw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface StoreInfo {
  id: string;
  name: string;
  primary_color: string;
  secondary_color: string;
  owner_email: string;
}

interface LogEntry {
  message: string;
  status: 'running' | 'success' | 'warning' | 'error';
  step?: string;
}

type JobStatus = 'idle' | 'running' | 'success' | 'error';

export default function AdminInjectPage() {
  const [email, setEmail] = useState('');
  const [store, setStore] = useState<StoreInfo | null>(null);
  const [searching, setSearching] = useState(false);
  const [siteId, setSiteId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [siteUrl, setSiteUrl] = useState('');

  const [jobStatus, setJobStatus] = useState<JobStatus>('idle');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [finalSiteUrl, setFinalSiteUrl] = useState('');
  const [injecting, setInjecting] = useState(false);

  const logsEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const searchStore = async () => {
    if (!email.trim()) {
      toast.error('Digite o email do cliente.');
      return;
    }

    setSearching(true);
    setStore(null);

    try {
      const res = await fetch(`/api/admin/inject/search?email=${encodeURIComponent(email.trim())}`);
      const data = await res.json();

      if (data.store) {
        setStore(data.store);
        toast.success(`Loja encontrada: ${data.store.name}`);
      } else {
        toast.error('Nenhuma loja encontrada para esse email.');
      }
    } catch {
      toast.error('Erro ao buscar loja.');
    } finally {
      setSearching(false);
    }
  };

  const handleInject = async () => {
    if (!store) {
      toast.error('Busque uma loja antes de injetar.');
      return;
    }
    if (!siteUrl.trim()) {
      toast.error('Site URL é obrigatório.');
      return;
    }

    setInjecting(true);
    setJobStatus('running');
    setLogs([]);
    setFinalSiteUrl('');

    try {
      // Update store with Wix credentials
      const updateRes = await fetch('/api/admin/inject/update-store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: store.id,
          wixSiteId: siteId.trim() || undefined,
          wixApiKey: apiKey.trim() || undefined,
          wixSiteUrl: siteUrl.trim(),
        }),
      });

      if (!updateRes.ok) {
        const err = await updateRes.json();
        throw new Error(err.error || 'Erro ao atualizar loja.');
      }

      // Start injection
      const injectRes = await fetch('/api/inject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: store.id,
          siteId: siteId.trim() || undefined,
          apiKey: apiKey.trim() || undefined,
          payload: {},
        }),
      });

      if (!injectRes.ok) {
        const err = await injectRes.json();
        throw new Error(err.error || 'Erro ao iniciar injeção.');
      }

      const { jobId } = await injectRes.json();

      // Connect SSE
      const evtSource = new EventSource(`/api/inject/${jobId}`);

      evtSource.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'log') {
          setLogs((prev) => [...prev, { message: data.message, status: data.status, step: data.step }]);
          setTimeout(scrollToBottom, 50);
        }

        if (data.type === 'complete') {
          setJobStatus('success');
          setFinalSiteUrl(data.siteUrl || siteUrl);
          setInjecting(false);
          evtSource.close();
          toast.success('Injeção concluída!');
        }

        if (data.type === 'error') {
          setJobStatus('error');
          setLogs((prev) => [...prev, { message: data.message, status: 'error' }]);
          setInjecting(false);
          evtSource.close();
          toast.error('Injeção falhou.');
        }
      };

      evtSource.onerror = () => {
        setJobStatus('error');
        setInjecting(false);
        evtSource.close();
        toast.error('Conexão com o servidor perdida.');
      };
    } catch (err) {
      setJobStatus('error');
      setInjecting(false);
      toast.error(err instanceof Error ? err.message : 'Erro inesperado.');
    }
  };

  const handleReset = () => {
    setJobStatus('idle');
    setLogs([]);
    setFinalSiteUrl('');
    setInjecting(false);
    setSiteId('');
    setApiKey('');
    setSiteUrl('');
    setStore(null);
    setEmail('');
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />;
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-400" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-400" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Syringe className="h-7 w-7 text-emerald-400" />
          <h1 className="text-2xl font-bold">Inserir Dados</h1>
        </div>

        {/* Alert */}
        <div className="flex items-center gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-yellow-300 text-sm">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>É importante estar logado na WIX do cliente</span>
        </div>

        {/* Client data card */}
        <Card>
          <CardHeader>
            <CardTitle>Dados do Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Email search */}
            <div className="flex gap-2">
              <Input
                placeholder="Email do cliente"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchStore()}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={searchStore}
                disabled={searching}
              >
                {searching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Store info */}
            {store && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-1 text-sm">
                <p className="font-semibold text-emerald-300">{store.name}</p>
                <div className="flex items-center gap-2 text-zinc-300">
                  Cor primária:
                  <span
                    className="inline-block h-4 w-4 rounded-full border border-zinc-600"
                    style={{ backgroundColor: store.primary_color || '#10b981' }}
                  />
                  <span className="font-mono text-xs">{store.primary_color || 'N/A'}</span>
                </div>
              </div>
            )}

            {/* Wix fields */}
            <Input
              placeholder="wix_site_id"
              className="font-mono"
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
            />
            <Input
              placeholder="wix_api_key"
              className="font-mono"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <Input
              placeholder="https://minha-loja.wixsite.com/site"
              className="font-mono"
              value={siteUrl}
              onChange={(e) => setSiteUrl(e.target.value)}
              required
            />

            {/* Inject button */}
            <Button
              className="w-full bg-emerald-500 text-black hover:bg-emerald-400 font-semibold"
              onClick={handleInject}
              disabled={injecting || !store}
            >
              {injecting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Inserir Dados
            </Button>
          </CardContent>
        </Card>

        {/* Logs */}
        {jobStatus !== 'idle' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Logs</CardTitle>
              <Badge
                variant={
                  jobStatus === 'success'
                    ? 'default'
                    : jobStatus === 'error'
                      ? 'destructive'
                      : 'secondary'
                }
              >
                {jobStatus === 'running' && 'Em andamento'}
                {jobStatus === 'success' && 'Concluido'}
                {jobStatus === 'error' && 'Erro'}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="max-h-72 overflow-y-auto space-y-2 text-sm">
                {logs.map((log, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="mt-0.5 shrink-0">{statusIcon(log.status)}</span>
                    <span className="text-zinc-300">{log.message}</span>
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Success card */}
        {jobStatus === 'success' && (
          <Card className="border-emerald-500/30">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-semibold">Injeção concluída com sucesso!</span>
              </div>

              {finalSiteUrl && (
                <a
                  href={finalSiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-emerald-400 hover:underline text-sm"
                >
                  <ExternalLink className="h-4 w-4" />
                  Abrir loja
                </a>
              )}

              <Button variant="outline" onClick={handleReset} className="w-full">
                <RotateCcw className="h-4 w-4 mr-2" />
                Nova Injecao
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
