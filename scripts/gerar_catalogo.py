#!/usr/bin/env python3
"""Índice estático de metadados MIDI; não lê nem altera o conteúdo musical."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import tempfile

PROJECT_ROOT = Path(__file__).resolve().parent.parent


def sort_key(value):
    return value.casefold(), value


def build_catalog(source, collection_id="classic"):
    if not re.fullmatch(r"[a-z0-9][a-z0-9_-]*", collection_id):
        raise ValueError("Identificador de coleção inválido: use letras minúsculas, números, _ ou -.")
    source = Path(source).absolute()
    if source.is_symlink():
        raise ValueError("A raiz do acervo não pode ser um link simbólico.")
    root = source.resolve(strict=True)
    if not root.is_dir():
        raise ValueError("MIDI_SOURCE_DIR deve apontar para um diretório.")
    entries = []
    ignored_links = 0

    def fail(error):
        raise error

    # fwalk usa descritores de diretório e não segue links durante a descida.
    for directory, directories, files, directory_fd in os.fwalk(root, follow_symlinks=False, onerror=fail):
        for name in list(directories):
            info = os.stat(name, dir_fd=directory_fd, follow_symlinks=False)
            if stat.S_ISLNK(info.st_mode):
                directories.remove(name)
                ignored_links += 1
        directories.sort(key=sort_key)
        for name in sorted(files, key=sort_key):
            info = os.stat(name, dir_fd=directory_fd, follow_symlinks=False)
            if stat.S_ISLNK(info.st_mode):
                ignored_links += 1
                continue
            if not stat.S_ISREG(info.st_mode) or Path(name).suffix.lower() not in {".mid", ".midi"}:
                continue
            relative = (Path(directory) / name).relative_to(root)
            hierarchy = list(relative.parts[:-1])
            relative_path = relative.as_posix()
            # O namespace da coleção evita colisões entre fontes com o mesmo caminho.
            identity = f"{collection_id}\0{relative_path}".encode("utf-8")
            title = re.sub(r"[_-]+", " ", Path(name).stem)
            title = re.sub(r"\s+", " ", title).strip() or Path(name).stem
            entries.append({
                "id": "m" + hashlib.sha256(identity).hexdigest(),
                "title": title,
                "composer": hierarchy[0] if hierarchy else "Compositor não identificado",
                "relativePath": relative_path,
                "hierarchy": hierarchy,
                "fileName": name,
                "sizeBytes": info.st_size,
                "collectionId": collection_id,
            })
    entries.sort(key=lambda entry: sort_key(entry["relativePath"]))
    if len({entry["id"] for entry in entries}) != len(entries):
        raise ValueError("Identificadores duplicados; catálogo não gravado.")
    composers = {}
    for entry in entries:
        if entry["hierarchy"]:
            composers[entry["composer"]] = composers.get(entry["composer"], 0) + 1
    summary = {
        "schemaVersion": 1,
        "collectionId": collection_id,
        "totalSongs": len(entries),
        "composerCount": len(composers),
        "filesByComposer": dict(sorted(composers.items(), key=lambda item: sort_key(item[0]))),
        "unidentifiedComposerSongs": sum(not entry["hierarchy"] for entry in entries),
        "totalSizeBytes": sum(entry["sizeBytes"] for entry in entries),
        "ignoredSymlinks": ignored_links,
    }
    return entries, summary


def write_json(target, value):
    target = Path(target)
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=target.parent, delete=False) as stream:
            temporary = Path(stream.name)
            json.dump(value, stream, ensure_ascii=False, indent=2)
            stream.write("\n")
        os.replace(temporary, target)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", default=os.environ.get("MIDI_SOURCE_DIR"), help="Raiz externa; padrão: MIDI_SOURCE_DIR")
    parser.add_argument("--collection", default="classic", help="Namespace estável da coleção (padrão: classic)")
    parser.add_argument("--output-dir", type=Path, help="Destino; padrão: catalogs/<coleção> no projeto")
    args = parser.parse_args()
    if not args.source:
        parser.error("Configure MIDI_SOURCE_DIR ou forneça --source. Nenhuma busca foi executada.")
    try:
        entries, summary = build_catalog(args.source, args.collection)
        destination = args.output_dir or PROJECT_ROOT / "catalogs" / args.collection
        root = Path(args.source).resolve()
        resolved_destination = destination.resolve()
        if resolved_destination == root or root in resolved_destination.parents:
            raise ValueError("O destino deve ficar fora do acervo original.")
        write_json(destination / "catalog.json", entries)
        write_json(destination / "summary.json", summary)
    except (OSError, ValueError) as error:
        parser.exit(1, f"Erro: {error}\n")
    print(f"{summary['totalSongs']} músicas; {summary['composerCount']} compositores; {summary['totalSizeBytes']} bytes.")
    print(f"Catálogo: {destination / 'catalog.json'}")
    print(f"Resumo: {destination / 'summary.json'}")


if __name__ == "__main__":
    main()
