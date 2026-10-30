#!/usr/bin/env python3
"""Empacota o build oficial; opcionalmente sincroniza MIDIs para a cópia versionada."""
import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import shutil
import tempfile
from urllib.parse import quote

ROOT = Path(__file__).resolve().parent.parent
VENDOR = ROOT / 'vendor/spessasynth'
CATALOG = ROOT / 'catalogs/classic/catalog.json'
PUBLIC = ROOT / 'public/midis'
DIST = ROOT / 'dist'


def midi_path(root, relative):
    rel = PurePosixPath(relative)
    if rel.is_absolute() or '..' in rel.parts or not rel.parts or rel.suffix.lower() not in {'.mid', '.midi'}:
        raise ValueError(f'Caminho MIDI inválido: {relative}')
    target = root.joinpath(*rel.parts)
    for parent in (target, *target.parents):
        if parent == root:
            break
        if parent.is_symlink():
            raise ValueError(f'Link simbólico não permitido: {relative}')
    resolved = target.resolve(strict=True)
    if not resolved.is_relative_to(root) or not resolved.is_file():
        raise ValueError(f'Arquivo fora da raiz: {relative}')
    return resolved


def write_json(file, data):
    file.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def personalizar_html_publicacao(html):
    # Aplica a identidade pública do Clave Sol MIDI ao HTML FINAL do build.
    import re

    titulo = 'Clave Sol MIDI — Biblioteca Musical'
    descricao = ('Explore, ouça e baixe músicas MIDI. Biblioteca musical com '
                 'visualização animada das notas, instrumentos e teclado virtual.')

    # Substitui metatags de prévia independentemente da ordem dos atributos.
    def filtrar_meta(match):
        tag = match.group(0)
        atributo = re.search(r'\b(?:name|property)\s*=\s*"([^"]+)"', tag, re.I)
        nome = atributo.group(1).lower() if atributo else ''
        if nome.startswith(('og:', 'twitter:')) or nome in ('description', 'author', 'keywords'):
            return ''
        return tag

    html = re.sub(r'<meta\b[^>]*>', filtrar_meta, html, flags=re.I | re.S)
    html = re.sub(r'<link\b(?=[^>]*\brel\s*=\s*"canonical")[^>]*>', '', html, flags=re.I | re.S)

    html, titulos = re.subn(r'<title\b[^>]*>.*?</title>', f'<title>{titulo}</title>',
                           html, count=1, flags=re.I | re.S)
    html, cabecalhos = re.subn(r'<h1\b(?=[^>]*\bid\s*=\s*"title")[^>]*>.*?</h1>',
                               f'<h1 id="title">{titulo}</h1>', html, count=1, flags=re.I | re.S)
    if titulos != 1 or cabecalhos != 1 or '</head>' not in html:
        raise ValueError('Estrutura HTML mudou: título ou cabeçalho não encontrado.')

    # Retira links promocionais antigos (já ocultos pela interface Clave Sol).
    html = re.sub(
        r'\s*<label\b(?=[^>]*\bclass\s*=\s*"link")[^>]*>\s*'
        r'<a\b(?=[^>]*\bhref\s*=\s*"https://(?:github\.com/spessasus/SpessaSynth[^"]*|discord\.gg/[^"]+)")[^>]*>'
        r'.*?</a>\s*</label>', '', html, flags=re.I | re.S)

    html = re.sub(r'<noscript\b[^>]*>.*?</noscript>',
                  '<noscript><h1>Ative o JavaScript para utilizar o Clave Sol MIDI.</h1></noscript>',
                  html, count=1, flags=re.I | re.S)

    metadados = f'''    <!-- Clave Sol MIDI: metadados da publicação -->
    <meta name="description" content="{descricao}">
    <meta name="author" content="Clave Sol">
    <link rel="canonical" href="https://midi.clavesol.com.br/">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Clave Sol MIDI">
    <meta property="og:title" content="{titulo}">
    <meta property="og:description" content="{descricao}">
    <meta property="og:url" content="https://midi.clavesol.com.br/">
    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="{titulo}">
    <meta name="twitter:description" content="{descricao}">
'''
    html = html.replace('</head>', metadados + '</head>', 1)
    html = html.replace('<html lang="en"', '<html lang="pt-BR"', 1)
    return html

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--sync-midis', action='store_true', help='Atualiza public/midis a partir do acervo externo, sem alterá-lo')
    parser.add_argument('--source', default=os.environ.get('MIDI_SOURCE_DIR'))
    parser.add_argument('--sync-only', action='store_true', help='Somente sincronização; não requer build')
    args = parser.parse_args()
    entries = json.loads(CATALOG.read_text(encoding='utf-8'))
    if not entries or len({e['relativePath'] for e in entries}) != len(entries):
        raise ValueError('Catálogo vazio ou com caminhos duplicados.')
    if args.sync_only and not args.sync_midis:
        parser.error('--sync-only requer --sync-midis')
    (ROOT / 'work').mkdir(exist_ok=True)
    if args.sync_midis:
        if not args.source:
            parser.error('Configure MIDI_SOURCE_DIR ou --source para sincronizar.')
        source = Path(args.source).resolve(strict=True)
        if source == ROOT or source.is_relative_to(ROOT) or ROOT.is_relative_to(source):
            raise ValueError('Use um acervo externo ao projeto para sincronizar.')
        with tempfile.TemporaryDirectory(dir=ROOT / 'work') as temporary:
            staged = Path(temporary) / 'midis'; staged.mkdir()
            for entry in entries:
                src = midi_path(source, entry['relativePath'])
                data = src.read_bytes()
                if len(data) != entry['sizeBytes']:
                    raise ValueError('Tamanho mudou; regenere o catálogo: ' + entry['relativePath'])
                target = staged / entry['relativePath']; target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(data)
                if hashlib.sha256(src.read_bytes()).digest() != hashlib.sha256(target.read_bytes()).digest():
                    raise ValueError('Arquivo mudou durante a cópia: ' + entry['relativePath'])
            PUBLIC.parent.mkdir(exist_ok=True)
            if PUBLIC.is_symlink(): raise ValueError('Destino public/midis é um link.')
            if PUBLIC.exists(): shutil.rmtree(PUBLIC)
            shutil.move(staged, PUBLIC)
        print(f'{len(entries)} MIDIs sincronizados para public/midis; originais intactos.')
    if args.sync_only:
        return
    build = VENDOR / 'local-dev'
    if not (build / 'local_main.js').is_file():
        raise ValueError('Execute o build oficial antes de preparar a publicação.')
    with tempfile.TemporaryDirectory(dir=ROOT / 'work') as temporary:
        output = Path(temporary) / 'dist'; output.mkdir()
        # All official browser bundles/workers/assets, but not sourcemaps/server/ZIPs.
        for file in build.iterdir():
            if file.is_file() and file.suffix not in {'.map', '.html'}:
                shutil.copyfile(file, output / file.name)
        html = (build / 'local_edition_index.html').read_text()
        html = html.replace('<html lang="en">', '<html lang="en" data-hosting="static">')
        if 'data-hosting="static"' not in html: raise ValueError('HTML upstream incompatível.')
        html = personalizar_html_publicacao(html)
        (output / 'index.html').write_text(html)
        library = []
        for entry in entries:
            source = midi_path(PUBLIC.resolve(strict=True), entry['relativePath'])
            if source.stat().st_size != entry['sizeBytes']: raise ValueError('Cópia versionada desatualizada: ' + entry['relativePath'])
            target = output / 'midis' / entry['relativePath']; target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, target)
            url = 'midis/' + quote(entry['relativePath'], safe='/')
            library.append({**entry, 'url': url, 'downloadUrl': url})
        write_json(output / 'library.json', library)
        test = next((e for e in library if e['relativePath'] == 'Borodin/bor_ps2.mid'), library[0])
        write_json(output / 'test-song.json', test)
        (output / 'soundfonts').mkdir()
        shutil.copyfile(VENDOR / 'soundfonts/GeneralUserGS.sf3', output / 'soundfonts/GeneralUserGS.sf3')
        write_json(output / 'soundfonts.json', [{'name': 'GeneralUserGS.sf3'}])
        version = json.loads((VENDOR / 'package.json').read_text())['version']
        (output / 'version.txt').write_text(version)
        for name in ('LICENSE', 'README.md'):
            shutil.copyfile(VENDOR / name, output / ('SPESSASYNTH-' + name))
        shutil.copytree(VENDOR / 'src/website/css/themes/font-licenses', output / 'font-licenses')
        shutil.copyfile(ROOT / 'CNAME', output / 'CNAME')
        (output / '.nojekyll').touch()
        if DIST.is_symlink(): raise ValueError('dist é um link simbólico.')
        if DIST.exists(): shutil.rmtree(DIST)
        shutil.move(output, DIST)
    print(f'Distribuição estática pronta: dist/ ({len(library)} músicas).')


if __name__ == '__main__':
    main()
