'use client';

import * as React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { StepIndicator } from '@/components/StepIndicator';
import { InjectLog } from '@/components/InjectLog';
import { Button } from '@/components/ui/button';
import { clearSession } from '@/lib/session';
import { Shirt, LayoutDashboard } from 'lucide-react';

const FLOW_STEPS = [
    { label: 'Nome & Cores' },
    { label: 'Layout' },
    { label: 'Banners' },
    { label: 'Logo' },
    { label: 'Ativar CMS' },
    { label: 'Publicar' },
];

function PublishingContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const jobId = searchParams.get('jobId');
    const [canGoDashboard, setCanGoDashboard] = React.useState(false);

    if (!jobId) {
        return (
            <div className="text-center py-12">
                <p className="text-zinc-400">Nenhum job de injeção encontrado.</p>
                <Button
                    onClick={() => router.push('/preview')}
                    className="mt-4 bg-emerald-500 text-black font-bold"
                >
                    Voltar ao Preview
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <InjectLog
                jobId={jobId}
                onComplete={(success) => {
                    setCanGoDashboard(true);
                    if (success) {
                        clearSession();
                    }
                }}
            />

            {canGoDashboard && (
                <div className="flex justify-center">
                    <Button
                        onClick={() => router.push('/dashboard')}
                        className="bg-emerald-500 text-black font-bold hover:bg-emerald-400"
                    >
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        Ir para o Dashboard
                    </Button>
                </div>
            )}
        </div>
    );
}

export default function PublishingPage() {
    return (
        <div className="min-h-screen bg-zinc-950 px-4 py-8">
            <div className="mx-auto max-w-3xl space-y-8">
                <div className="text-center space-y-2">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
                        <Shirt className="h-6 w-6 text-emerald-500" />
                    </div>
                    <h1 className="text-3xl font-bold">Kit Store Builder</h1>
                    <p className="text-zinc-400">Publicando sua loja...</p>
                </div>

                <StepIndicator steps={FLOW_STEPS} currentStep={4} />

                <Suspense fallback={<div className="text-center py-12 text-zinc-400">Carregando...</div>}>
                    <PublishingContent />
                </Suspense>
            </div>
        </div>
    );
}
