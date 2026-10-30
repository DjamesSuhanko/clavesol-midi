/** Content-Length may describe compressed bytes, not the stream decoded by fetch. */
export async function readSoundFont(response: Response, progress: (percent: number | undefined) => void): Promise<ArrayBuffer> {
    if (!response.ok || !response.body) {
        throw new Error(`Download da SoundFont falhou (HTTP ${response.status}).`);
    }
    const size = Number(response.headers.get("content-length"));
    const encoding = response.headers.get("content-encoding");
    const knownSize = Number.isFinite(size) && size > 0 && (!encoding || encoding === "identity");
    const chunks: Uint8Array[] = [];
    let total = 0;
    const reader = response.body.getReader();
    try {
        progress(knownSize ? 0 : undefined);
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            total += value.byteLength;
            progress(knownSize ? Math.min(99, Math.round(total / size * 100)) : undefined);
        }
    } finally { reader.releaseLock(); }
    if (total === 0) throw new Error("O arquivo da SoundFont está vazio.");
    const binary = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) { binary.set(chunk, offset); offset += chunk.byteLength; }
    progress(100);
    return binary.buffer;
}
