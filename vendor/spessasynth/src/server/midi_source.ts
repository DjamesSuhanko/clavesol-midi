/** Clave Sol local demonstration: one selected file, never a directory listing. */
import fs from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";

const PREFIX = "/clave-sol/midi-test";
const MAX_BYTES = 16 * 1024 * 1024;

function contained(root: string, target: string) {
    const relative = path.relative(root, target);
    return relative !== "" && !relative.startsWith(".." + path.sep) && relative !== ".." && !path.isAbsolute(relative);
}

export async function readMidi(root: string, relative: string) {
    if (path.isAbsolute(relative) || !/\.midi?$/i.test(relative)) {
        throw new Error("Caminho MIDI inválido.");
    }
    const candidate = path.resolve(root, relative);
    if (!contained(root, candidate)) throw new Error("Caminho fora de MIDI_SOURCE_DIR.");
    const real = await fs.realpath(candidate);
    if (!contained(root, real)) throw new Error("Link fora de MIDI_SOURCE_DIR.");
    const handle = await fs.open(real, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    try {
        // On Linux, validate the actual opened file as well, closing rename/symlink races.
        if (process.platform === "linux" && !contained(root, await fs.realpath(`/proc/self/fd/${handle.fd}`))) {
            throw new Error("Arquivo aberto fora de MIDI_SOURCE_DIR.");
        }
        const stat = await handle.stat();
        if (!stat.isFile() || stat.size > MAX_BYTES || stat.size < 14) throw new Error("MIDI inválido ou maior que 16 MiB.");
        const binary = await handle.readFile();
        if (binary.toString("ascii", 0, 4) !== "MThd" || binary.readUInt32BE(4) !== 6 || binary.readUInt16BE(8) > 2 || binary.readUInt16BE(10) === 0) {
            throw new Error("Cabeçalho MIDI inválido.");
        }
        let offset = 14;
        for (let track = 0; track < binary.readUInt16BE(10); track++) {
            if (offset + 8 > binary.length || binary.toString("ascii", offset, offset + 4) !== "MTrk") throw new Error("Trilha MIDI inválida.");
            offset += 8 + binary.readUInt32BE(offset + 4);
            if (offset > binary.length) throw new Error("MIDI truncado.");
        }
        return binary;
    } finally {
        await handle.close();
    }
}

export async function selectMidi(source: string | undefined, selected?: string) {
    if (!source) throw new Error("Configure MIDI_SOURCE_DIR no ambiente ou em .env.local e reinicie npm start.");
    const root = await fs.realpath(source);
    const rootStat = await fs.stat(root);
    if (!rootStat.isDirectory()) throw new Error("MIDI_SOURCE_DIR deve ser um diretório.");
    if (selected) {
        await readMidi(root, selected);
        return { root, relativePath: selected };
    }
    let inspected = 0;
    const visited = new Set<string>();
    async function first(directory: string, depth: number): Promise<string | undefined> {
        if (depth > 16) return;
        const real = await fs.realpath(directory);
        if ((real !== root && !contained(root, real)) || visited.has(real)) return;
        visited.add(real);
        const entries = await fs.opendir(directory);
        for await (const entry of entries) {
            if (++inspected > 256) throw new Error("Busca limitada a 256 entradas. Configure MIDI_TEST_FILE com um caminho relativo específico.");
            const candidate = path.join(directory, entry.name);
            try {
                const info = await fs.stat(candidate);
                if (info.isDirectory()) {
                    const found = await first(candidate, depth + 1);
                    if (found) return found;
                } else if (/\.midi?$/i.test(entry.name)) {
                    const relative = path.relative(root, candidate);
                    await readMidi(root, relative);
                    return relative;
                }
            } catch (error) {
                if (inspected > 256) throw error;
                // Skip inaccessible, invalid or escaping entries; never modify originals.
            }
        }
        return;
    }
    const relativePath = await first(root, 0);
    if (!relativePath) throw new Error("Nenhum MIDI válido encontrado na busca limitada. Configure MIDI_TEST_FILE.");
    return { root, relativePath };
}

export function createMidiRoute(source: string | undefined, selected?: string) {
    let selection: ReturnType<typeof selectMidi> | undefined;
    return async (req: IncomingMessage, res: ServerResponse): Promise<boolean> => {
        if (!req.url?.startsWith(PREFIX)) return false;
        res.setHeader("Cache-Control", "no-store");
        res.setHeader("X-Content-Type-Options", "nosniff");
        if (req.method !== "GET" || (req.url !== PREFIX && req.url !== PREFIX + "/file")) {
            res.writeHead(400);
            res.end("Rota MIDI inválida; não aceita caminhos nem parâmetros.");
            return true;
        }
        try {
            // Keep the first choice (or failure) for this process; no repeated traversal.
            selection ??= selectMidi(source, selected);
            const { root, relativePath } = await selection;
            const binary = await readMidi(root, relativePath);
            if (req.url === PREFIX) {
                res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
                res.end(JSON.stringify({ fileName: path.basename(relativePath), relativePath, url: PREFIX + "/file" }));
            } else {
                res.writeHead(200, { "Content-Type": "audio/midi", "Content-Length": binary.length });
                res.end(binary);
            }
        } catch (error) {
            res.writeHead(503, { "Content-Type": "application/json; charset=utf-8" });
            // Do not expose OS errors, absolute filenames or stack traces to the browser.
            const message = source ? "Não foi possível abrir o MIDI de teste. Verifique MIDI_SOURCE_DIR e MIDI_TEST_FILE (caminho relativo), permissões e formato MIDI. A busca automática é limitada a 256 entradas e 16 níveis." : "Configure MIDI_SOURCE_DIR no ambiente ou em .env.local e reinicie npm start.";
            console.warn("MIDI de teste indisponível:", error instanceof Error ? error.message : "erro");
            res.end(JSON.stringify({ error: message }));
        }
        return true;
    };
}
