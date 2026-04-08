'use client';

import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { StepIndicator } from '@/components/StepIndicator';
import { ImageGrid } from '@/components/ImageGrid';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getSession, getSessionSnapshot, setSession, subscribeSession } from '@/lib/session';
import { getPromoBannerImages, getTestimonialImages, type ImageItem } from '@/lib/imageBank';
import type { SessionData } from '@/lib/schemas';
import { ArrowRight, ArrowLeft, Image as ImageIcon, Shirt } from 'lucide-react';

const FLOW_STEPS = [
    { label: 'Dados da Loja' },
    { label: 'Conteúdo' },
    { label: 'Imagens' },
    { label: 'Preview' },
    { label: 'Publicar' },
    { label: 'Dashboard' },
];

export default function HeroImagePage() {
    const router = useRouter();
    const sessionSnapshot = useSyncExternalStore(subscribeSession, getSessionSnapshot, () => null);
    const session = useMemo<SessionData>(() => {
        if (!sessionSnapshot) return {};

        try {
            return JSON.parse(sessionSnapshot) as SessionData;
        } catch {
            return {};
        }
    }, [sessionSnapshot]);
    const heroBannerDesktopUrl = session.onboarding?.heroBannerDesktopUrl;
    const heroBannerName = session.onboarding?.heroBannerId;
    const sessionContent = session.content;
    const promoImage = session.images?.promoBanner;
    const testimonial1 = session.images?.testimonial1;
    const testimonial2 = session.images?.testimonial2;

    const promoImages = getPromoBannerImages();
    const testimonialImages = getTestimonialImages();

    useEffect(() => {
        if (!session.content) {
            toast.error('Gere o conteúdo primeiro');
            router.push('/generate');
            return;
        }
    }, [router, session.content]);

    const handleSelect = (
        slot: 'promoBanner' | 'testimonial1' | 'testimonial2',
        image: ImageItem
    ) => {
        const current = getSession();
        const images = {
            ...current.images,
            [slot]: image.url,
        };
        setSession({ images });
    };

    const allSelected = testimonial1 && testimonial2;

    const handleNext = () => {
        if (!allSelected) {
            toast.error('Selecione as imagens dos 2 depoimentos');
            return;
        }
        router.push('/preview');
    };

    return (
        <div className="min-h-screen bg-zinc-950 px-4 py-8">
            <div className="mx-auto max-w-4xl space-y-8">
                <div className="text-center space-y-2">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
                        <Shirt className="h-6 w-6 text-emerald-500" />
                    </div>
                    <h1 className="text-3xl font-bold">Construtor de lojas</h1>
                </div>

                <StepIndicator steps={FLOW_STEPS} currentStep={2} />

                <div className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5 text-emerald-500" />
                    <h2 className="text-xl font-bold">Seleção de Imagens</h2>
                </div>

                <div className="space-y-6">
                    <Card className="border-zinc-800 bg-zinc-900">
                        <CardHeader>
                            <CardTitle className="text-white text-base">
                                Hero principal escolhido no onboarding
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {heroBannerDesktopUrl && (
                                <div className="relative mb-4 aspect-[21/9] overflow-hidden rounded-lg">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={heroBannerDesktopUrl} alt="Hero selecionado" className="h-full w-full object-cover" />
                                </div>
                            )}
                            <p className="text-sm text-zinc-400">
                                Este banner vem do cardapio escolhido no onboarding e sera usado como hero principal da Home.
                            </p>
                            {heroBannerName && (
                                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-emerald-400">
                                    Banner selecionado: {heroBannerName}
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Promo Banner Image */}
                    <Card className="border-zinc-800 bg-zinc-900">
                        <CardHeader>
                            <CardTitle className="text-white text-base">
                                Banner Promocional (opcional)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {promoImage && (
                                <div className="relative mb-4 aspect-[21/7] overflow-hidden rounded-lg">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={promoImage} alt="Promo Banner" className="h-full w-full object-cover" />
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                        <div className="text-center">
                                            <h3 className="text-3xl font-bold text-white">{sessionContent?.promoBanner.title}</h3>
                                            <p className="text-zinc-200">{sessionContent?.promoBanner.subtitle}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <ImageGrid
                                images={promoImages}
                                selectedId={promoImages.find((i) => i.url === promoImage)?.id}
                                onSelect={(img) => handleSelect('promoBanner', img)}
                                onUpload={() => { }}
                            />
                        </CardContent>
                    </Card>

                    <Card className="border-zinc-800 bg-zinc-900">
                        <CardHeader>
                            <CardTitle className="text-white text-base">
                                Depoimento 1: {sessionContent?.testimonials?.[0]?.name || 'Cliente 1'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {testimonial1 && (
                                <div className="relative mb-4 aspect-[4/5] max-w-xs overflow-hidden rounded-lg">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={testimonial1} alt="Depoimento 1" className="h-full w-full object-cover" />
                                </div>
                            )}
                            <ImageGrid
                                images={testimonialImages}
                                selectedId={testimonialImages.find((i) => i.url === testimonial1)?.id}
                                onSelect={(img) => handleSelect('testimonial1', img)}
                                onUpload={() => { }}
                            />
                        </CardContent>
                    </Card>

                    <Card className="border-zinc-800 bg-zinc-900">
                        <CardHeader>
                            <CardTitle className="text-white text-base">
                                Depoimento 2: {sessionContent?.testimonials?.[1]?.name || 'Cliente 2'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {testimonial2 && (
                                <div className="relative mb-4 aspect-[4/5] max-w-xs overflow-hidden rounded-lg">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={testimonial2} alt="Depoimento 2" className="h-full w-full object-cover" />
                                </div>
                            )}
                            <ImageGrid
                                images={testimonialImages}
                                selectedId={testimonialImages.find((i) => i.url === testimonial2)?.id}
                                onSelect={(img) => handleSelect('testimonial2', img)}
                                onUpload={() => { }}
                            />
                        </CardContent>
                    </Card>
                </div>

                {/* Navigation */}
                <div className="flex justify-between">
                    <Button
                        variant="outline"
                        onClick={() => router.push('/generate')}
                        className="border-zinc-700 text-zinc-300"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                    </Button>
                    <Button
                        onClick={handleNext}
                        disabled={!allSelected}
                        className="bg-emerald-500 text-black font-bold hover:bg-emerald-400 disabled:opacity-50"
                    >
                        Próximo: Preview <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
