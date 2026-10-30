/** Local sample only: IDs map to trusted entries, never to client-supplied paths. */
import fs from "node:fs/promises";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { readMidi } from "./midi_source.ts";

export interface LibraryEntry {
    id: string;
    title: string;
    composer: string;
    relativePath: string;
    hierarchy?: string[];
    categoryId?: string;
    categoryName?: string;
}

export function createLibraryRoute(source: string | undefined, entries: LibraryEntry[], sources: Record<string, string> = {}) {
    const prefix = "/clave-sol/library";
    return async (req: IncomingMessage, res: ServerResponse): Promise<boolean> => {
        if (!req.url?.startsWith(prefix)) return false;
        res.setHeader("Cache-Control", "no-store");
        res.setHeader("X-Content-Type-Options", "nosniff");
        const match = /^\/clave-sol\/library\/([a-z0-9]+)\/(file|download)$/.exec(req.url);
        if (req.method !== "GET" || (req.url !== prefix && !match)) {
            res.writeHead(400); res.end("Rota inválida."); return true;
        }
        if (!source && Object.keys(sources).length === 0) {
            res.writeHead(503, { "Content-Type": "application/json; charset=utf-8" });
            res.end(JSON.stringify({ error: "Configure MIDI_SOURCE_DIR em .env.local e reinicie npm start." }));
            return true;
        }
        if (req.url === prefix) {
            res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
            res.end(JSON.stringify(entries.map(({ id, title, composer, relativePath, hierarchy, categoryId, categoryName }) => ({
                id, title, composer, hierarchy, categoryId, categoryName, fileName: path.basename(relativePath),
                url: `${prefix}/${id}/file`, downloadUrl: `${prefix}/${id}/download`
            }))));
            return true;
        }
        const entry = entries.find((item) => item.id === match?.[1]);
        if (!entry) { res.writeHead(404); res.end("Música fora da amostra."); return true; }
        try {
            const selectedSource = sources[entry.categoryId ?? "classic"] ?? ((!entry.categoryId || entry.categoryId === "classic") ? source : undefined);
            if (!selectedSource) throw new Error("Category source not configured");
            const root = await fs.realpath(selectedSource);
            const binary = await readMidi(root, entry.relativePath);
            if (match?.[2] === "download") {
                const filename = encodeURIComponent(path.basename(entry.relativePath)).replaceAll("'", "%27");
                res.setHeader("Content-Disposition", `attachment; filename="music.mid"; filename*=UTF-8''${filename}`);
            }
            res.writeHead(200, { "Content-Type": "audio/midi", "Content-Length": binary.length });
            res.end(binary);
        } catch {
            res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
            res.end(JSON.stringify({ error: "MIDI indisponível. Verifique a fonte e o índice da amostra." }));
        }
        return true;
    };
}
