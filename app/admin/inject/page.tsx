'use client';

import { useState, useEffect } from 'react';
import {
  Syringe,
  AlertTriangle,
  Search,
  Upload,
  Loader2,
  CheckCircle2,
  ExternalLink,
  RotateCcw,
  RefreshCw,
  Check,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface StoreInfo {
  id: string;
  name: string;
  primary_color: string;
  secondary_color: string;
  owner_email: string;
}

interface StoreRow {
  id: string;
  name: string;
  owner_email: string | null;
  wix_site_id: string | null;
  wix_api_key: string | null;
  wix_site_url: string | null;
  primary_color: string | null;
}

type PageStatus = 'idle' | 'success' | 'error';

export default function AdminInjectPage() {
  const [email, setEmail] = useState('');
  const [store, setStore] = useState<StoreInfo | null>(null);
  const [searching, setSearching] = useState(false);
  const [siteId, setSiteId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [siteUrl, setSiteUrl] = useState('');
  const [status, setStatus] = useState<PageStatus>('idle');
  const [finalSiteUrl, setFinalSiteUrl] = useState('');
  const [injecting, setInjecting] = useState(false);

  const [stores, setStores] = useState<StoreRow[]>([]);
  const [loadingStores, setLoadingStores] = useState(true);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchStores = async () => {
    setLoadingStores(true);
    try {
      const res = await fetch('/api/admin/inject/stores');
      const data = await res.json();
      setStores(data.stores || []);
    } catch {
      toast.error('Erro ao carregar lojas.');
    } finally {
      setLoadingStores(false);
    }
  };

  useEffect(() => {
    fetchStores();
  }, []);

  const toggleCheck = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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

    try {
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

      setStatus('success');
      setFinalSiteUrl(siteUrl.trim());
      toast.success('Dados inseridos com sucesso!');
      fetchStores();
    } catch (err) {
      setStatus('error');
      toast.error(err instanceof Error ? err.message : 'Erro inesperado.');
    } finally {
      setInjecting(false);
    }
  };

  const handleReset = () => {
    setStatus('idle');
    setFinalSiteUrl('');
    setInjecting(false);
    setSiteId('');
    setApiKey('');
    setSiteUrl('');
    setStore(null);
    setEmail('');
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
              placeholder="WIX Site ID"
              className="font-mono"
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
            />
            <Input
              placeholder="WIX API KEY"
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

        {/* Success card */}
        {status === 'success' && (
          <Card className="border-emerald-500/30">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-semibold">Dados inseridos com sucesso!</span>
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
        {/* Stores list */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Lojas Cadastradas</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchStores}
              disabled={loadingStores}
            >
              <RefreshCw className={`h-4 w-4 ${loadingStores ? 'animate-spin' : ''}`} />
            </Button>
          </CardHeader>
          <CardContent>
            {loadingStores && stores.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-zinc-500">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Carregando...
              </div>
            ) : stores.length === 0 ? (
              <p className="text-center text-zinc-500 py-8">Nenhuma loja cadastrada.</p>
            ) : (
              <div className="space-y-2">
                {stores.map((s) => (
                  <div
                    key={s.id}
                    className={`rounded-lg border transition-colors ${
                      checked.has(s.id)
                        ? 'border-emerald-500/30 bg-emerald-500/5 opacity-60'
                        : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 p-3">
                      {/* Checkbox */}
                      <div
                        onClick={(e) => { e.stopPropagation(); toggleCheck(s.id); }}
                        className={`flex shrink-0 items-center justify-center h-5 w-5 rounded border cursor-pointer transition-colors ${
                          checked.has(s.id)
                            ? 'bg-emerald-500 border-emerald-500'
                            : 'border-zinc-600 bg-zinc-800 hover:border-zinc-500'
                        }`}
                      >
                        {checked.has(s.id) && <Check className="h-3 w-3 text-black" />}
                      </div>

                      {/* Color dot */}
                      <span
                        className="shrink-0 h-3 w-3 rounded-full border border-zinc-700"
                        style={{ backgroundColor: s.primary_color || '#10b981' }}
                      />

                      {/* Info - clickable to expand */}
                      <div
                        className="flex-1 min-w-0 text-sm cursor-pointer"
                        onClick={() => setExpanded(expanded === s.id ? null : s.id)}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`font-medium truncate ${checked.has(s.id) ? 'line-through text-zinc-500' : 'text-white'}`}>
                            {s.name}
                          </span>
                        </div>
                        <p className="text-zinc-500 text-xs truncate">{s.owner_email || 'Sem email'}</p>
                      </div>

                      {/* Wix status badges */}
                      <div className="flex shrink-0 gap-1.5">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${s.wix_site_id && s.wix_site_id !== 'pending' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}>
                          SiteID
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${s.wix_api_key ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}>
                          API
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${s.wix_site_url ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}>
                          URL
                        </span>
                      </div>
                    </div>

                    {/* Expanded details */}
                    {expanded === s.id && (
                      <div className="border-t border-zinc-800 px-3 py-3 space-y-1.5 text-xs font-mono text-zinc-400">
                        <div><span className="text-zinc-500">Site ID:</span> {s.wix_site_id && s.wix_site_id !== 'pending' ? s.wix_site_id : <span className="text-zinc-600 italic">vazio</span>}</div>
                        <div><span className="text-zinc-500">API Key:</span> {s.wix_api_key ? `${s.wix_api_key.slice(0, 12)}...` : <span className="text-zinc-600 italic">vazio</span>}</div>
                        <div>
                          <span className="text-zinc-500">URL:</span>{' '}
                          {s.wix_site_url ? (
                            <a href={s.wix_site_url} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline break-all">
                              {s.wix_site_url}
                            </a>
                          ) : (
                            <span className="text-zinc-600 italic">vazio</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
