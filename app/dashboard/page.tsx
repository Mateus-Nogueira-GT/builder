'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { StoreCard } from '@/components/StoreCard';
import { Shirt, Plus, Loader2, LogOut } from 'lucide-react';
import { clearSession, setSession } from '@/lib/session';
import type { Store } from '@/lib/schemas';

export default function DashboardPage() {
    const router = useRouter();
    const [stores, setStores] = useState<Store[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/stores')
            .then((r) => r.json())
            .then((data) => {
                if (Array.isArray(data)) {
                    setStores(data);
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const handleNewStore = () => {
        clearSession();
        router.push('/onboarding');
    };

    const handleLogout = async () => {
        clearSession();
        await signOut({ callbackUrl: '/login' });
    };

    return (
        <div className="min-h-screen bg-zinc-950 px-4 py-8">
            <div className="mx-auto max-w-5xl space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                            <Shirt className="h-5 w-5 text-emerald-500" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">Kit Store Builder</h1>
                            <p className="text-sm text-zinc-400">Suas lojas configuradas</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleNewStore}
                            className="inline-flex h-9 items-center justify-center rounded-lg bg-emerald-500 px-4 text-sm font-bold text-black transition-colors hover:bg-emerald-400"
                        >
                            <Plus className="mr-2 h-4 w-4" /> Nova Loja
                        </button>
                        <button
                            type="button"
                            onClick={handleLogout}
                            className="inline-flex h-9 items-center justify-center rounded-lg border border-zinc-700 px-4 text-sm text-zinc-300 transition-colors hover:border-red-500 hover:text-red-400"
                        >
                            <LogOut className="mr-2 h-4 w-4" /> Sair
                        </button>
                    </div>
                </div>

                {/* Loading */}
                {loading && (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                    </div>
                )}

                {/* Empty state */}
                {!loading && stores.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 space-y-4">
                        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800">
                            <Shirt className="h-10 w-10 text-zinc-600" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-lg font-semibold text-white">
                                Nenhuma loja configurada
                            </h3>
                            <p className="mt-1 text-sm text-zinc-400">
                                Crie sua primeira loja de camisas de time em minutos
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleNewStore}
                            className="inline-flex h-9 items-center justify-center rounded-lg bg-emerald-500 px-4 text-sm font-bold text-black transition-colors hover:bg-emerald-400"
                        >
                            <Plus className="mr-2 h-4 w-4" /> Criar Primeira Loja
                        </button>
                    </div>
                )}

                {/* Store grid */}
                {!loading && stores.length > 0 && (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {stores.map((store) => (
                            <StoreCard
                                key={store.id}
                                id={store.id}
                                name={store.name}
                                siteUrl={store.wix_site_url}
                                lastInjection={store.created_at}
                                onConfigure={() => {
                                    // Popula a sessão com os dados da loja para reconfiguração
                                    const onboardingData = {
                                        connectionMethod: (store.connection_method || 'api_key') as 'api_key' | 'oauth',
                                        apiKey: store.wix_api_key || '',
                                        siteId: store.wix_site_id,
                                        storeName: store.name,
                                        siteUrl: store.wix_site_url || '',
                                        email: store.owner_email || '',
                                        whatsapp: store.whatsapp || '',
                                        instagram: store.instagram || '',
                                        city: store.city || '',
                                        state: store.state || '',
                                        focus: (store.focus as 'brasileirao' | 'copa' | 'retro' | 'todos' | null) || 'todos',
                                        featuredTeams: [],
                                        activePromotion: store.active_promotion || 'Compre 2 Leve 3',
                                        primaryColor: store.primary_color,
                                        secondaryColor: store.secondary_color,
                                        heroBannerColor: 'VERMELHO',
                                        heroBannerId: '',
                                        heroBannerDesktopUrl: '',
                                        heroBannerMobileUrl: '',
                                        heroBannerThumbnailUrl: '',
                                        siteName: store.name, // Força o reconhecimento de "conectado"
                                        instanceId: store.wix_instance_id || '',
                                    };
                                    setSession({ onboarding: onboardingData, storeId: store.id });
                                    router.push('/onboarding');
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
