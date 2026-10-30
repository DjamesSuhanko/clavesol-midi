# Origem e alterações locais

SpessaSynth Web App completo: https://github.com/spessasus/SpessaSynth
Tag: **v4.4.0**
Commit: **1f95f3a737592fb78db9504a0152465f3d60c5d3**

Importado com `git archive` em `vendor/spessasynth`, sem submódulo nem `.git` aninhado. O package-lock.json original foi preservado; instale com npm ci, nunca resolvendo novamente os seletores latest do package.json.

Na Etapa 1, a única alteração no código oficial estava em `vendor/spessasynth/src/server/server.ts`, marcada com comentários Clave Sol:
- SPESSASYNTH_HOST permite usar 127.0.0.1 no comando da raiz.
- SPESSASYNTH_AUTO_UPDATE=0 evita que o atualizador oficial substitua a versão fixada. O atualizador permanece no código.

No checkpoint da Etapa 1, todos os demais arquivos importados, inclusive licença Apache 2.0, README, atribuições, interface, sintetizador, mixer, efeitos, visualizações e exportações, foram preservados byte a byte. A Etapa 2 adiciona os temas descritos em ETAPA-2.md, mantendo os componentes funcionais.

## Demonstração e SoundFont

GeneralUserGS.sf3 é a SoundFont original incluída no aplicativo, de S. Christian Collins. Os créditos e informações incorporadas no banco foram preservados; a licença do aplicativo não substitui os termos dos assets.

`demo/The HYBRID Collage (v2.0).mid`: composto e arranjado por S. Christian Collins para GeneralUserGS; cópia do repositório oficial https://github.com/spessasus/spessasynth-demo-songs no commit **58f3bc63269a621f9baedb819752408c51d9c38a**. O README original de créditos está em `demo/UPSTREAM-README.md`. Nenhum MIDI pessoal foi copiado. Este MIDI é para a demonstração local; não se atribui a ele a licença Apache do aplicativo.

## Manutenção futura

Edite os fontes em vendor/spessasynth/src e compile novamente. Para atualizar o fornecedor, compare com o commit registrado e preserve/reavalie as duas opções do servidor. Não use o atualizador binário da edição local neste checkout de desenvolvimento.

## Etapa 3A

Checkpoint da Etapa 2: `69caf7f`. A ponte local de MIDI externo está documentada em ETAPA-3A.md. Ela acrescenta uma rota restrita ao servidor e reutiliza startMidi/Manager.play com um File; não altera sintetizador, sequenciador ou renderer. Dependências preservadas.

## Etapa 3B

Checkpoint anterior: `0a4d9fa`. Índice JSON de 18 entradas, módulo de rotas locais por ID reutilizando readMidi e painel independente que reutiliza startMidi/Manager.play. Integrações no servidor, HTML, CSS, entrada local e empacotamento do índice. Consulte ETAPA-3B.md para a lista de arquivos. Nenhuma alteração no núcleo do sintetizador/renderer ou nas dependências.

## Integração estática e catálogo completo

O servidor local lê catalogs/classic/catalog.json. O módulo static_mode.ts e pequenas condições nas entradas local_main/midi_library/midi_test_button alternam o transporte local/estático, preservando a interface e os componentes internos. scripts/preparar_publicacao.py empacota local-dev do build oficial com a SoundFont e a cópia versionada dos MIDIs. Ver PUBLICACAO.md.
