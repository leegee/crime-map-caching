export async function retry<T>(
    fn: () => Promise<T>,
    retries: number = 3,
    delayMs: number = 500
): Promise<T> {
    let lastError: any;
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (err) {
            lastError = err;
            console.warn(`Retry ${i + 1}/${retries} failed`, err);
            await new Promise(res => setTimeout(res, delayMs * (i + 1)));
        }
    }
    throw lastError;
}
