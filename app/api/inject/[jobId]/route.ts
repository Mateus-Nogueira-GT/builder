import { getProvisionRun } from '@/lib/provisioning';

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ jobId: string }> }
) {
    const { jobId } = await params;
    const encoder = new TextEncoder();
    let lastSentIndex = 0;

    const stream = new ReadableStream({
        async start(controller) {
            let isClosed = false;

            const closeStream = () => {
                if (isClosed) return;
                isClosed = true;
                controller.close();
            };

            const sendEvent = (data: Record<string, unknown>) => {
                if (isClosed) return;
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
            };

            const interval = setInterval(async () => {
                if (isClosed) return;

                try {
                    let data;
                    try {
                        data = await getProvisionRun(jobId);
                    } catch {
                        sendEvent({ type: 'error', message: 'Provisionamento nao encontrado.' });
                        clearInterval(interval);
                        closeStream();
                        return;
                    }

                    const result = (data.result as Record<string, unknown> | null) || {};
                    const logs = Array.isArray(result.logs) ? result.logs : [];

                    while (lastSentIndex < logs.length) {
                        const log = logs[lastSentIndex] as Record<string, unknown>;
                        sendEvent({
                            type: 'log',
                            message: log.message,
                            status: log.status,
                            step: log.step,
                        });
                        lastSentIndex++;
                    }

                    if (data.status === 'success') {
                        sendEvent({
                            type: 'complete',
                            siteUrl: result.siteUrl || '',
                        });
                        clearInterval(interval);
                        closeStream();
                    }

                    if (data.status === 'error') {
                        sendEvent({
                            type: 'error',
                            message: result.lastError || 'Provisionamento falhou.',
                        });
                        clearInterval(interval);
                        closeStream();
                    }
                } catch (error) {
                    sendEvent({
                        type: 'error',
                        message: error instanceof Error ? error.message : 'Erro ao acompanhar provisionamento.',
                    });
                    clearInterval(interval);
                    closeStream();
                }
            }, 800);

            setTimeout(() => {
                clearInterval(interval);
                closeStream();
            }, 300000);
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
        },
    });
}
