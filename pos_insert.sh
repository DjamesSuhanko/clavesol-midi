#!/bin/bash
echo "Gerando catálogo..."
env -u MIDI_SOURCE_DIR python3 scripts/gerar_catalogo.py --all
echo "Preparando publicacao"
python3 scripts/preparar_publicacao.py --sync-midis --sync-only
echo "Build do projeto"
npm run build:pages
