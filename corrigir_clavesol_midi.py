#!/usr/bin/env python3
"""Integra a personalização da identidade Clave Sol MIDI ao build de publicação.
Execute na raiz do projeto: python3 /caminho/corrigir_clavesol_midi.py
Não requer dependências externas.
"""
from pathlib import Path

path = Path('scripts/preparar_publicacao.py')
if not path.is_file():
    raise SystemExit('ERRO: execute este script na raiz de clavesol-midi.')
original = path.read_text(encoding='utf-8')
if 'def personalizar_html_publicacao(html):' in original:
    print('Personalização já está presente no preparador. Nada foi alterado.')
    raise SystemExit(0)

helper = r"""def personalizar_html_publicacao(html):
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

"""
needle = "        (output / 'index.html').write_text(html)"
if original.count('def main():') != 1 or original.count(needle) != 1:
    raise SystemExit('ERRO: scripts/preparar_publicacao.py tem estrutura inesperada; nada modificado.')
updated = original.replace('def main():', helper + 'def main():', 1)
updated = updated.replace(needle, '        html = personalizar_html_publicacao(html)\n' + needle, 1)
compile(updated, str(path), 'exec')
path.write_text(updated, encoding='utf-8')
print('OK: scripts/preparar_publicacao.py agora personaliza o HTML após cada build.')
print('Próximo passo: npm run build:pages')
