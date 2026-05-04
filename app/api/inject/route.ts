import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createLog, createProvisionRun, appendProvisionLog, getProvisionRun } from '@/lib/provisioning';
import { publishSite, runTemplatePreflight, ensureCollection, clearCollection, upsertItem, bulkUpsertItems, createProducts, enableCms, resolveAuthHeader } from '@/lib/wix';
import { fetchTorcedorProductIds, fetchProductsByFocus } from '@/lib/externalCatalog';
import { mapToWixProduct } from '@/lib/productMapper';
import { fetchSiteIdFromInstance } from '@/lib/wixOAuth';
import { kickoffSizeUpdateJob } from '@/lib/sizeMigration';
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

        let store: { id: string; name: string; wix_api_key: string | null; wix_site_id: string; wix_instance_id: string | null } | null = null;

        if (resolvedStoreId) {
            const { data: storeData, error: storeError } = await supabase
                .from('stores')
                .select('id, name, wix_api_key, wix_site_id, wix_instance_id')
                .eq('id', resolvedStoreId)
                .single();

            if (storeError || !storeData) {
                return NextResponse.json(
                    { error: 'Loja selecionada nao foi encontrada no banco.' },
                    { status: 404 }
                );
            }

            store = storeData;

            if (!storeData.wix_api_key) {
                return NextResponse.json(
                    { error: 'A loja selecionada nao possui apiKey salva.' },
                    { status: 400 }
                );
            }

            resolvedApiKey = storeData.wix_api_key;
            resolvedSiteId = storeData.wix_site_id;

            // Webhook cria o store com wix_site_id="pending"; só o OAuth callback substitui
            // pelo siteId real. Se o callback não rodou (state ausente, fluxo diferente),
            // resolvemos aqui via Wix Apps API antes de seguir.
            if ((!resolvedSiteId || resolvedSiteId === 'pending') && storeData.wix_instance_id) {
                console.log(`[inject] siteId pendente, resolvendo via Wix Apps API | instanceId=${storeData.wix_instance_id}`);
                const fetched = await fetchSiteIdFromInstance(storeData.wix_instance_id);
                if (!fetched) {
                    return NextResponse.json(
                        {
                            error: 'Não foi possível identificar o site Wix associado à loja. Verifique se autorizou um site, não a conta inteira.',
                            instanceId: storeData.wix_instance_id,
                        },
                        { status: 502 }
                    );
                }
                resolvedSiteId = fetched;
                await supabase
                    .from('stores')
                    .update({ wix_site_id: fetched })
                    .eq('id', resolvedStoreId);
                store = { ...storeData, wix_site_id: fetched };
                console.log(`[inject] siteId salvo: ${fetched}`);
            }

            if (!resolvedSiteId || resolvedSiteId === 'pending') {
                return NextResponse.json(
                    { error: 'A loja selecionada nao possui siteId resolvido.' },
                    { status: 400 }
                );
            }
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
                instanceId: store?.wix_instance_id || null,
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
    const instanceId = payload.instanceId as string | undefined;
    const authToken = await resolveAuthHeader(apiKey, instanceId);
    const siteId = payload.siteId as string;
    const storeId = payload.storeId as string | undefined;
    const content = payload as Record<string, unknown>;

    await appendProvisionLog(runId, createLog('Provisionamento iniciado.', 'running'), {
        status: 'running',
        currentStep: 'cms-activation',
    });

    // ── CMS Activation ──
    await appendProvisionLog(runId, createLog('Ativando CMS no site Wix...', 'running', 'cms-activation'), {
        status: 'running',
        currentStep: 'cms-activation',
    });

    const accountId = process.env.WIX_ACCOUNT_ID || '';
    const adminKey = process.env.WIX_ADMIN_API_KEY || '';
    const cmsActive = await enableCms(authToken, siteId, accountId, adminKey);

    if (cmsActive) {
        await appendProvisionLog(runId, createLog('CMS ativado com sucesso.', 'success', 'cms-activation'), {
            status: 'running',
            currentStep: 'preflight',
        });
    } else {
        await appendProvisionLog(runId, createLog('Não foi possível ativar o CMS automaticamente. Tentando prosseguir...', 'warning', 'cms-activation'), {
            status: 'running',
            currentStep: 'preflight',
        });
    }

    const preflight = await runTemplatePreflight(authToken, siteId, REQUIRED_COLLECTIONS);
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

    await ensureCollection(authToken, siteId, COLLECTIONS.storeConfig, 'Configuracoes da Loja', [
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
    await ensureCollection(authToken, siteId, COLLECTIONS.banners, 'Banners e Hero', [
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
    await ensureCollection(authToken, siteId, COLLECTIONS.trustBar, 'Trust Bar', [
        { key: 'icon', type: 'TEXT' },
        { key: 'text', type: 'TEXT' },
        { key: 'order', type: 'NUMBER' },
    ]);
    await ensureCollection(authToken, siteId, COLLECTIONS.categories, 'Categorias', [
        { key: 'name', type: 'TEXT' },
        { key: 'image', type: 'URL' },
        { key: 'link', type: 'URL' },
        { key: 'order', type: 'NUMBER' },
    ]);
    await ensureCollection(authToken, siteId, COLLECTIONS.promoBanner, 'Banner Promocional', [
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

    await clearCollection(authToken, siteId, COLLECTIONS.storeConfig);
    await upsertItem(authToken, siteId, COLLECTIONS.storeConfig, {
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

    const injectCollection = async (_colId: string, label: string, fn: () => Promise<void>) => {
        try { await fn(); }
        catch (err) {
            await appendProvisionLog(runId, createLog(`Falha ao injetar ${label}: ${err instanceof Error ? err.message : 'erro'}`, 'warning', 'content'));
        }
    };

    await injectCollection(COLLECTIONS.banners, 'Banners', async () => {
        await clearCollection(authToken, siteId, COLLECTIONS.banners);
        await upsertItem(authToken, siteId, COLLECTIONS.banners, {
            title: (promoBanner.title as string) || '',
            subtext: (promoBanner.subtitle as string) || '',
            ctaLabel: (promoBanner.ctaLabel as string) || '',
            ctaLink: (promoBanner.ctaLink as string) || '',
            theme: 'dark', order: 0,
            image: onboarding.heroBannerDesktopUrl || '',
            mobileImage: onboarding.heroBannerMobileUrl || '',
            bgColor: onboarding.bannerBgColor || '',
            textColor: onboarding.bannerTextColor || '',
            ctaColor: onboarding.bannerCtaColor || '',
        });
    });

    await injectCollection(COLLECTIONS.trustBar, 'Trust Bar', async () => {
        await clearCollection(authToken, siteId, COLLECTIONS.trustBar);
        await bulkUpsertItems(authToken, siteId, COLLECTIONS.trustBar,
            trustBar.map((item, index) => ({ ...item, order: index }))
        );
    });

    await injectCollection(COLLECTIONS.categories, 'Categorias', async () => {
        await clearCollection(authToken, siteId, COLLECTIONS.categories);
        await bulkUpsertItems(authToken, siteId, COLLECTIONS.categories,
            categories.map((item, index) => ({ ...item, order: index }))
        );
    });

    await injectCollection(COLLECTIONS.promoBanner, 'Promo Banner', async () => {
        await clearCollection(authToken, siteId, COLLECTIONS.promoBanner);
        await upsertItem(authToken, siteId, COLLECTIONS.promoBanner, {
            ...promoBanner, image: images.promoBanner || '',
        });
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
        const sizesStats = {
            total: initialProducts.length,
            withSizes: initialProducts.filter((p) => Array.isArray(p.sizes) && p.sizes.length > 0).length,
            sampleSizes: initialProducts.find((p) => Array.isArray(p.sizes) && p.sizes.length > 0)?.sizes ?? null,
            sampleSku: initialProducts.find((p) => Array.isArray(p.sizes) && p.sizes.length > 0)?.sku ?? null,
        };
        console.log('[inject] catalog sizes stats:', JSON.stringify(sizesStats));
        await appendProvisionLog(
            runId,
            createLog(`Catálogo: ${sizesStats.withSizes}/${sizesStats.total} produtos com tamanhos. Exemplo: ${JSON.stringify(sizesStats.sampleSizes)}`, 'running', 'products'),
            { status: 'running', currentStep: 'products' }
        );
        if (initialProducts.length > 0) {
            const wixProducts = initialProducts.map((p) => mapToWixProduct(p, { withSizes: true }));
            const result = await createProducts(authToken, siteId, wixProducts);
            await appendProvisionLog(
                runId,
                createLog(
                    `Produtos iniciais: ${result.created} criados, ${result.failed} falhas. Tamanhos aplicados: ${result.optionsApplied}, falhas: ${result.optionsFailed}.`,
                    result.failed > 0 || result.optionsFailed > 0 ? 'warning' : 'success',
                    'products'
                ),
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

    const published = await publishSite(authToken, siteId);
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

    // Trigger size update job — mesmo fluxo retroativo do /api/atualizar-tamanhos.
    // Helper compartilhado: idempotente (devolve job existente se ja roda).
    if (storeId) {
        try {
            const { data: storeOwner } = await supabase
                .from('stores')
                .select('owner_email')
                .eq('id', storeId)
                .single();

            const kickoff = await kickoffSizeUpdateJob({
                storeId,
                siteId,
                ownerEmail: storeOwner?.owner_email ?? null,
                authHeader: authToken,
                baseUrl: process.env.NEXTAUTH_URL ?? '',
            });

            await appendProvisionLog(
                runId,
                createLog(
                    `Job de tamanhos iniciado em background (jobId=${kickoff.jobId}, total=${kickoff.totalProducts}${kickoff.alreadyRunning ? ', ja rodava' : ''}).`,
                    'success',
                    'finalize'
                ),
                { status: 'running', currentStep: 'finalize' }
            );
        } catch (err) {
            console.warn('[inject] falha ao iniciar size_update_job:', err);
            await appendProvisionLog(
                runId,
                createLog(
                    `Falha ao iniciar job de tamanhos: ${err instanceof Error ? err.message : 'erro'}`,
                    'warning',
                    'finalize'
                )
            );
        }
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
                    apiKey: apiKey,
                    instanceId: instanceId || null,
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
