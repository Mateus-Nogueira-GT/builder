'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { StepIndicator } from '@/components/StepIndicator';
import { ContentBlock } from '@/components/ContentBlock';
import { Button } from '@/components/ui/button';
import { getSession, setSession } from '@/lib/session';
import type { StoreContent } from '@/lib/schemas';
import { Loader2, ArrowRight, RotateCcw, Sparkles, Shirt } from 'lucide-react';

const FLOW_STEPS = [
    { label: 'Dados da Loja' },
    { label: 'Conteúdo' },
    { label: 'Imagens' },
    { label: 'Preview' },
    { label: 'Publicar' },
    { label: 'Dashboard' },
];

export default function GeneratePage() {
    const router = useRouter();
    const [content, setContent] = useState<StoreContent | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const generateContent = useCallback(async () => {
        const session = getSession();
        if (!session.onboarding) {
            toast.error('Complete o onboarding primeiro');
            router.push('/onboarding');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...session.onboarding, onboarding: session.onboarding }),
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Erro na geração');
            }

            const data: StoreContent = await res.json();
            setContent(data);
            setSession({ content: data });
            toast.success('Conteúdo gerado com sucesso!');
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erro ao gerar conteúdo';
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    }, [router]);

    useEffect(() => {
        const session = getSession();
        if (session.content) {
            setContent(session.content);
            setLoading(false);
        } else {
            generateContent();
        }
    }, [generateContent]);

    const updateField = (section: string, key: string, value: string) => {
        if (!content) return;

        const updated = { ...content };

        if (section === 'topbar') {
            updated.topbar = value;
        } else if (section === 'whatsapp') {
            updated.whatsappGreeting = value;
        } else if (section.startsWith('trust-')) {
            const idx = parseInt(section.split('-')[1]);
            updated.trustBar = [...updated.trustBar];
            updated.trustBar[idx] = { ...updated.trustBar[idx], [key]: value };
        } else if (section === 'promo') {
            updated.promoBanner = { ...updated.promoBanner, [key]: value };
        } else if (section.startsWith('testimonial-')) {
            const idx = parseInt(section.split('-')[1]);
            updated.testimonials = [...updated.testimonials];
            updated.testimonials[idx] = { ...updated.testimonials[idx], [key]: value };
        } else if (section.startsWith('category-')) {
            const idx = parseInt(section.split('-')[1]);
            updated.categories = [...(updated.categories || [])];
            updated.categories[idx] = { ...updated.categories[idx], [key]: value };
        } else if (section === 'footer') {
            updated.footer = { ...updated.footer, [key]: value };
        }

        setContent(updated);
        setSession({ content: updated });
    };

    const allComplete = content
        ? content.topbar.length > 0 &&
        content.trustBar.every((t) => t.text) &&
        content.promoBanner.title.length > 0 &&
        content.testimonials.every((t) => t.name && t.text) &&
        (content.categories?.length === 4) &&
        content.footer.tagline.length > 0
        : false;

    const handleNext = () => {
        if (!allComplete) {
            toast.error('Complete todos os blocos antes de avançar');
            return;
        }
        setSession({ content: content! });
        router.push('/hero-image');
    };

    // Skeleton loader
    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-950 px-4 py-8">
                <div className="mx-auto max-w-3xl space-y-8">
                    <div className="text-center space-y-2">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
                            <Shirt className="h-6 w-6 text-emerald-500" />
                        </div>
                        <h1 className="text-3xl font-bold">Kit Store Builder</h1>
                    </div>
                    <StepIndicator steps={FLOW_STEPS} currentStep={1} />

                    <div className="space-y-4">
                        <div className="flex items-center justify-center gap-3 py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                            <div>
                                <p className="text-lg font-semibold text-white">
                                    Gerando conteúdo com IA...
                                </p>
                                <p className="text-sm text-zinc-400">
                                    Isso pode levar alguns segundos
                                </p>
                            </div>
                        </div>

                        {[1, 2, 3, 4, 5].map((i) => (
                            <div
                                key={i}
                                className="h-24 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900"
                            />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
                <div className="text-center space-y-4">
                    <p className="text-red-400 text-lg">{error}</p>
                    <Button onClick={generateContent} className="bg-emerald-500 text-black font-bold">
                        <RotateCcw className="mr-2 h-4 w-4" /> Tentar novamente
                    </Button>
                </div>
            </div>
        );
    }

    if (!content) return null;

    return (
        <div className="min-h-screen bg-zinc-950 px-4 py-8">
            <div className="mx-auto max-w-3xl space-y-8">
                <div className="text-center space-y-2">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
                        <Shirt className="h-6 w-6 text-emerald-500" />
                    </div>
                    <h1 className="text-3xl font-bold">Kit Store Builder</h1>
                </div>

                <StepIndicator steps={FLOW_STEPS} currentStep={1} />

                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-emerald-500" />
                        Conteúdo Gerado
                    </h2>
                    <Button
                        variant="outline"
                        onClick={generateContent}
                        className="border-zinc-700 text-zinc-300 hover:border-emerald-500"
                    >
                        <RotateCcw className="mr-2 h-4 w-4" /> Regenerar tudo
                    </Button>
                </div>

                <div className="space-y-4">
                    {/* Topbar + WhatsApp */}
                    <ContentBlock
                        title="Configurações Gerais"
                        isComplete={content.topbar.length > 0 && content.whatsappGreeting.length > 0}
                        fields={[
                            { key: 'topbar', label: 'Texto do Topbar', value: content.topbar },
                            { key: 'whatsappGreeting', label: 'Mensagem WhatsApp', value: content.whatsappGreeting },
                        ]}
                        onFieldChange={(key, value) => {
                            if (key === 'topbar') updateField('topbar', key, value);
                            else updateField('whatsapp', key, value);
                        }}
                    />

                    {/* Trust Bar */}
                    <ContentBlock
                        title="Trust Bar"
                        isComplete={content.trustBar.every((t) => t.text.length > 0)}
                        fields={content.trustBar.flatMap((item, i) => [
                            { key: `icon-${i}`, label: `Ícone ${i + 1}`, value: item.icon },
                            { key: `text-${i}`, label: `Texto ${i + 1}`, value: item.text },
                        ])}
                        onFieldChange={(key, value) => {
                            const [field, idxStr] = key.split('-');
                            const idx = parseInt(idxStr);
                            updateField(`trust-${idx}`, field, value);
                        }}
                    />

                    {/* Promo Banner */}
                    <ContentBlock
                        title="Banner Promocional"
                        isComplete={content.promoBanner.title.length > 0}
                        fields={[
                            { key: 'title', label: 'Título', value: content.promoBanner.title },
                            { key: 'subtitle', label: 'Subtítulo', value: content.promoBanner.subtitle },
                            { key: 'ctaLabel', label: 'Texto do Botão', value: content.promoBanner.ctaLabel },
                            { key: 'ctaLink', label: 'Link do Botão', value: content.promoBanner.ctaLink },
                        ]}
                        onFieldChange={(key, value) => updateField('promo', key, value)}
                    />

                    {/* Testimonials */}
                    {content.testimonials.map((test, i) => (
                        <ContentBlock
                            key={`test-${i}`}
                            title={`Depoimento ${i + 1}`}
                            isComplete={!!test.name && !!test.text}
                            fields={[
                                { key: 'name', label: 'Nome', value: test.name },
                                { key: 'city', label: 'Cidade', value: test.city },
                                { key: 'rating', label: 'Nota (1-5)', value: String(test.rating) },
                                { key: 'text', label: 'Depoimento', value: test.text, type: 'textarea' as const },
                            ]}
                            onFieldChange={(key, value) => {
                                if (key === 'rating') {
                                    updateField(`testimonial-${i}`, key, value);
                                } else {
                                    updateField(`testimonial-${i}`, key, value);
                                }
                            }}
                        />
                    ))}

                    {/* Categories */}
                    <ContentBlock
                        title="Categorias de Produtos"
                        isComplete={content.categories?.length === 4}
                        fields={content.categories?.flatMap((cat, i) => [
                            { key: `name-${i}`, label: `Nome ${i + 1}`, value: cat.name },
                            { key: `image-${i}`, label: `Prompt da Imagem ${i + 1}`, value: cat.image || '', type: 'textarea' as const },
                        ]) || []}
                        onFieldChange={(key, value) => {
                            const [field, idxStr] = key.split('-');
                            const idx = parseInt(idxStr);
                            updateField(`category-${idx}`, field === 'name' ? 'name' : 'image', value);
                        }}
                    />

                    {/* Footer */}
                    <ContentBlock
                        title="Footer"
                        isComplete={content.footer.tagline.length > 0 && content.footer.aboutText.length > 0}
                        fields={[
                            { key: 'tagline', label: 'Tagline', value: content.footer.tagline },
                            { key: 'aboutText', label: 'Sobre Nós', value: content.footer.aboutText, type: 'textarea' as const },
                        ]}
                        onFieldChange={(key, value) => updateField('footer', key, value)}
                    />
                </div>

                {/* Next button */}
                <div className="flex justify-end">
                    <Button
                        onClick={handleNext}
                        disabled={!allComplete}
                        className="bg-emerald-500 text-black font-bold hover:bg-emerald-400 disabled:opacity-50"
                    >
                        Próximo: Escolher Imagens <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
