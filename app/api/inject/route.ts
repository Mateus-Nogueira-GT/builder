import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createLog, createProvisionRun, appendProvisionLog, getProvisionRun } from '@/lib/provisioning';
import { publishSite, runTemplatePreflight, ensureCollection, clearCollection, upsertItem, bulkUpsertItems, createProducts } from '@/lib/wix';
import { fetchTorcedorProductIds, fetchProductsByFocus } from '@/lib/externalCatalog';
import { mapToWixProduct } from '@/lib/productMapper';
import { COLLECTIONS } from '@/config/collections';

const REQUIRED_COLLECTIONS = [
    { id: COLLECTIONS.storeConfig, label: 'Configuracoes da loja' },
    { id: COLLECTIONS.banners, label: 'Banners e hero' },
    { id: COLLECTIONS.trustBar, label: 'Trust bar' },
    { id: COLLECTIONS.promoBanner, label: 'Banner promocional' },
    { id: COLLECTIONS.categories, label: 'Categorias' },
];

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { payload, storeId, apiKey, siteId } = body;

        const resolvedStoreId = storeId as string | undefined;
        let resolvedApiKey = apiKey as string | undefined;
        let resolvedSiteId = siteId as string | undefined;

        if (resolvedStoreId) {
            const { data: store, error: storeError } = await supabase
                .from('stores')
                .select('id, name, wix_api_key, wix_site_id')
                .eq('id', resolvedStoreId)
                .single();

            if (storeError || !store) {
                return NextResponse.json(
                    { error: 'Loja selecionada nao foi encontrada no banco.' },
                    { status: 404 }
                );
            }

            if (!store.wix_api_key || !store.wix_site_id) {
                return NextResponse.json(
                    { error: 'A loja selecionada nao possui apiKey ou siteId salvos.' },
                    { status: 400 }
                );
            }

            resolvedApiKey = store.wix_api_key;
            resolvedSiteId = store.wix_site_id;
        }

        if (!payload || !resolvedSiteId || !resolvedApiKey) {
            return NextResponse.json(
                { error: 'payload, apiKey e siteId sao obrigatorios' },
                { status: 400 }
            );
        }

        const run = await createProvisionRun({
            storeId: resolvedStoreId,
            siteId: resolvedSiteId,
            payload: {
                ...payload,
                apiKey: resolvedApiKey,
                siteId: resolvedSiteId,
                storeId: resolvedStoreId || null,
            },
        });

        const usesInjectionStorage = (run.result as Record<string, unknown> | null)?.storage === 'injections';

        let injectionId: string | null = usesInjectionStorage ? run.id : null;
        if (resolvedStoreId && !usesInjectionStorage) {
            const { data, error } = await supabase
                .from('injections')
                .insert({
                    store_id: resolvedStoreId,
                    payload,
                    status: 'pending',
                    result: { runId: run.id, logs: [] },
                })
                .select('id')
                .single();

            if (!error) {
                injectionId = data.id;
            }
        }

        processProvisionRun(run.id, injectionId).catch(async (error) => {
            console.error('Provision process error:', error);
            await appendProvisionLog(
                run.id,
                createLog(error instanceof Error ? error.message : 'Erro inesperado', 'error'),
                {
                    status: 'error',
                    currentStep: null,
                    lastError: error instanceof Error ? error.message : 'Erro inesperado',
                    completedAt: new Date().toISOString(),
                }
            );
        });

        return NextResponse.json({ jobId: run.id, injectionId });
    } catch (error) {
        console.error('Inject error:', error);
        const message = error instanceof Error ? error.message : 'Erro ao iniciar provisionamento';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

async function processProvisionRun(runId: string, injectionId: string | null) {
    const run = await getProvisionRun(runId);
    const payload = run.payload as Record<string, unknown>;
    const apiKey = payload.apiKey as string;
    const siteId = payload.siteId as string;
    const storeId = payload.storeId as string | undefined;
    const content = payload as Record<string, unknown>;

    await appendProvisionLog(runId, createLog('Provisionamento iniciado.', 'running'), {
        status: 'running',
        currentStep: 'preflight',
    });

    const preflight = await runTemplatePreflight(apiKey, siteId, REQUIRED_COLLECTIONS);
    for (const check of preflight.checks) {
        await appendProvisionLog(
            runId,
            createLog(`${check.label}: ${check.details}`, check.status, 'preflight'),
            { status: check.status === 'error' ? 'error' : 'running', currentStep: 'preflight' }
        );
    }

    if (!preflight.ok) {
        await finalizeFailure(runId, injectionId, 'Preflight do template falhou.');
        return;
    }

    await appendProvisionLog(runId, createLog('Preparando collections CMS.', 'running', 'collections'), {
        status: 'running',
        currentStep: 'collections',
    });

    await ensureCollection(apiKey, siteId, COLLECTIONS.storeConfig, 'Configuracoes da Loja', [
        { key: 'topbar', type: 'TEXT' },
        { key: 'whatsappGreeting', type: 'TEXT' },
        { key: 'tagline', type: 'TEXT' },
        { key: 'aboutText', type: 'RICH_TEXT' },
        { key: 'logo', type: 'URL' },
        { key: 'primaryColor', type: 'TEXT' },
        { key: 'secondaryColor', type: 'TEXT' },
        { key: 'accentColor', type: 'TEXT' },
        { key: 'layoutType', type: 'TEXT' },
        { key: 'bannerBgColor', type: 'TEXT' },
        { key: 'bannerTextColor', type: 'TEXT' },
        { key: 'bannerCtaColor', type: 'TEXT' },
        { key: 'logoSvg', type: 'TEXT' },
        { key: 'logoVariant', type: 'TEXT' },
    ]);
    await ensureCollection(apiKey, siteId, COLLECTIONS.banners, 'Banners e Hero', [
        { key: 'title', type: 'TEXT' },
        { key: 'subtext', type: 'TEXT' },
        { key: 'ctaLabel', type: 'TEXT' },
        { key: 'ctaLink', type: 'URL' },
        { key: 'theme', type: 'TEXT' },
        { key: 'order', type: 'NUMBER' },
        { key: 'image', type: 'URL' },
        { key: 'mobileImage', type: 'URL' },
        { key: 'bgColor', type: 'TEXT' },
        { key: 'textColor', type: 'TEXT' },
        { key: 'ctaColor', type: 'TEXT' },
    ]);
    await ensureCollection(apiKey, siteId, COLLECTIONS.trustBar, 'Trust Bar', [
        { key: 'icon', type: 'TEXT' },
        { key: 'text', type: 'TEXT' },
        { key: 'order', type: 'NUMBER' },
    ]);
    await ensureCollection(apiKey, siteId, COLLECTIONS.categories, 'Categorias', [
        { key: 'name', type: 'TEXT' },
        { key: 'image', type: 'URL' },
        { key: 'link', type: 'URL' },
        { key: 'order', type: 'NUMBER' },
    ]);
    await ensureCollection(apiKey, siteId, COLLECTIONS.promoBanner, 'Banner Promocional', [
        { key: 'title', type: 'TEXT' },
        { key: 'subtitle', type: 'TEXT' },
        { key: 'ctaLabel', type: 'TEXT' },
        { key: 'ctaLink', type: 'URL' },
        { key: 'image', type: 'URL' },
    ]);

    await appendProvisionLog(runId, createLog('Collections preparadas para injeção.', 'success', 'collections'), {
        status: 'running',
        currentStep: 'content',
    });

    await appendProvisionLog(runId, createLog('Injetando conteúdo principal.', 'running', 'content'), {
        status: 'running',
        currentStep: 'content',
    });

    const onboarding = (content.onboarding as Record<string, string>) || {};
    const images = (content.images as Record<string, string>) || {};
    const trustBar = (content.trustBar as Record<string, unknown>[]) || [];
    const categories = (content.categories as Record<string, unknown>[]) || [];
    const testimonials = (content.testimonials as Record<string, unknown>[]) || [];
    const promoBanner = (content.promoBanner as Record<string, unknown>) || {};
    const footer = (content.footer as Record<string, unknown>) || {};

    await clearCollection(apiKey, siteId, COLLECTIONS.storeConfig);
    await upsertItem(apiKey, siteId, COLLECTIONS.storeConfig, {
        topbar: content.topbar || '',
        whatsappGreeting: content.whatsappGreeting || '',
        tagline: footer.tagline || '',
        aboutText: footer.aboutText || '',
        logo: images.logo || '',
        primaryColor: onboarding.primaryColor || '#10b981',
        secondaryColor: onboarding.secondaryColor || '#18181b',
        accentColor: onboarding.accentColor || '',
        layoutType: onboarding.layoutType || 'classic',
        bannerBgColor: onboarding.bannerBgColor || '',
        bannerTextColor: onboarding.bannerTextColor || '',
        bannerCtaColor: onboarding.bannerCtaColor || '',
        logoSvg: onboarding.logoSvg || '',
        logoVariant: onboarding.logoVariant || '',
    });

    await clearCollection(apiKey, siteId, COLLECTIONS.banners);
    await upsertItem(apiKey, siteId, COLLECTIONS.banners, {
        title: (promoBanner.title as string) || '',
        subtext: (promoBanner.subtitle as string) || '',
        ctaLabel: (promoBanner.ctaLabel as string) || '',
        ctaLink: (promoBanner.ctaLink as string) || '',
        theme: 'dark',
        order: 0,
        image: onboarding.heroBannerDesktopUrl || '',
        mobileImage: onboarding.heroBannerMobileUrl || '',
        bgColor: onboarding.bannerBgColor || '',
        textColor: onboarding.bannerTextColor || '',
        ctaColor: onboarding.bannerCtaColor || '',
    });

    await clearCollection(apiKey, siteId, COLLECTIONS.trustBar);
    await bulkUpsertItems(
        apiKey,
        siteId,
        COLLECTIONS.trustBar,
        trustBar.map((item, index) => ({
            ...item,
            order: index,
        }))
    );

    await clearCollection(apiKey, siteId, COLLECTIONS.categories);
    await bulkUpsertItems(
        apiKey,
        siteId,
        COLLECTIONS.categories,
        categories.map((item, index) => ({
            ...item,
            order: index,
        }))
    );

    await clearCollection(apiKey, siteId, COLLECTIONS.promoBanner);
    await upsertItem(apiKey, siteId, COLLECTIONS.promoBanner, {
        ...promoBanner,
        image: images.promoBanner || '',
    });

    await appendProvisionLog(runId, createLog('Conteúdo base injetado.', 'success', 'content'), {
        status: 'running',
        currentStep: 'images',
    });

    await appendProvisionLog(runId, createLog('Associando imagens e assets da loja.', 'success', 'images'), {
        status: 'running',
        currentStep: 'branding',
    });


    // ── Product Injection ──
    await appendProvisionLog(runId, createLog('Injetando produtos iniciais...', 'running', 'products'), {
        status: 'running',
        currentStep: 'products',
    });

    try {
        const focus = (onboarding.focus as string) || 'todos';
        const initialProducts = await fetchProductsByFocus(focus, 100);
        if (initialProducts.length > 0) {
            const wixProducts = initialProducts.map(mapToWixProduct);
            const result = await createProducts(apiKey, siteId, wixProducts);
            await appendProvisionLog(
                runId,
                createLog(`Produtos iniciais: ${result.created} criados, ${result.failed} falhas.`, result.failed > 0 ? 'warning' : 'success', 'products'),
                { status: 'running', currentStep: 'branding' }
            );
        } else {
            await appendProvisionLog(runId, createLog('Nenhum produto encontrado no catálogo.', 'warning', 'products'), {
                status: 'running',
                currentStep: 'branding',
            });
        }
    } catch (err) {
        await appendProvisionLog(
            runId,
            createLog(`Erro ao injetar produtos: ${err instanceof Error ? err.message : 'Erro desconhecido'}`, 'warning', 'products'),
            { status: 'running', currentStep: 'branding' }
        );
    }

    await appendProvisionLog(runId, createLog('Aplicando branding final do template.', 'success', 'branding'), {
        status: 'running',
        currentStep: 'publish',
    });

    const published = await publishSite(apiKey, siteId);
    if (!published) {
        await appendProvisionLog(runId, createLog('Falha na publicação automática. A loja está montada, mas pode exigir publicação manual no Wix.', 'warning', 'publish'), {
            status: 'running',
            currentStep: 'finalize',
        });
    } else {
        await appendProvisionLog(runId, createLog('Loja publicada no Wix.', 'success', 'publish'), {
            status: 'running',
            currentStep: 'finalize',
        });
    }

    const siteUrl = preflight.siteUrl || '';
    if (storeId) {
        await supabase
            .from('stores')
            .update({ template_ready: true, wix_site_url: siteUrl || null })
            .eq('id', storeId);
    }

    // Trigger background product sync
    try {
        const allProductIds = await fetchTorcedorProductIds();
        if (allProductIds.length > 100) {
            fetch(`${process.env.NEXTAUTH_URL}/api/products/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    storeId: storeId || '',
                    siteId,
                    apiKey,
                    totalProductIds: allProductIds,
                    initialOffset: 100,
                }),
            }).catch((err) => {
                console.warn('Failed to trigger background sync:', err);
            });
        }
    } catch (err) {
        console.warn('Failed to fetch product IDs for background sync:', err);
    }

    await appendProvisionLog(runId, createLog('Provisionamento finalizado.', 'success', 'finalize'), {
        status: 'success',
        currentStep: null,
        siteUrl,
        completedAt: new Date().toISOString(),
    });

    if (injectionId) {
        await supabase
            .from('injections')
            .update({
                status: published ? 'success' : 'partial',
                result: (await getProvisionRun(runId)).result || { runId },
            })
            .eq('id', injectionId);
    }
}

async function finalizeFailure(runId: string, injectionId: string | null, message: string) {
    await appendProvisionLog(runId, createLog(message, 'error'), {
        status: 'error',
        currentStep: null,
        lastError: message,
        completedAt: new Date().toISOString(),
    });

    if (injectionId) {
        await supabase
            .from('injections')
            .update({
                status: 'error',
                result: (await getProvisionRun(runId)).result || { error: message },
            })
            .eq('id', injectionId);
    }
}
