export async function retry<T>(
    fn: () => Promise<T>,
    retries: number,
    delayMs: number
): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            return await fn();
        } catch (err) {
            lastError = err;

            if (attempt === retries) break;

            const retryAfter = Number((err as any).retryAfter);

            const delay = Number.isFinite(retryAfter)
                ? retryAfter * 1000
                : delayMs * (attempt + 1);

            await new Promise(resolve =>
                setTimeout(resolve, delay)
            );
        }
    }

    throw lastError;
}
