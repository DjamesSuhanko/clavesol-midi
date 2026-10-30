# Clave Sol MIDI

SpessaSynth Web App **completo**, com temas Clave Sol claro e escuro. Biblioteca integrada ao catálogo completo de 337 músicas e 26 compositores. Veja ETAPA-2.md para os temas e ETAPA-3B.md para a biblioteca.

## Categorias

A biblioteca está organizada em **Clássicas → compositor → subpastas → música**. O cadastro fica em `categories.json`; as origens locais em `categories.local.json`, ignorado pelo Git. Consulte a seção Categorias de `PUBLICACAO.md` para adicionar uma coleção por configuração. Pesquisa, reprodução e download permanecem os existentes.

## Publicação estática

Consulte `PUBLICACAO.md` para atualizar os MIDIs, preparar `dist/` e publicar manualmente. `npm run build:pages` usa o build oficial e somente arquivos versionados. O workflow `.github/workflows/publicar.yml` possui exclusivamente `workflow_dispatch`; nenhum push inicia publicação.

Os registros de etapas abaixo são históricos; a biblioteca atual utiliza o catálogo completo e a cópia autorizada para publicação fica em `public/midis/`.

## Gerador de catálogo — Etapa 4A

```bash
MIDI_SOURCE_DIR=/home/djames/Documents/MIDIS/Classic python3 scripts/gerar_catalogo.py
```

Gera manualmente `catalogs/classic/catalog.json` e `summary.json`: 337 músicas, 26 compositores e 8.116.500 bytes. Não modifica a biblioteca atual de 18 músicas nem copia arquivos MIDI. Consulte `ETAPA-4A.md` para esquema, configuração de outras coleções e testes. O gerador usa Python 3.10+ e não lê `.env.local` automaticamente.

## Biblioteca inicial — Etapa 3B

Execute `npm start` e abra **Biblioteca de músicas**. Pesquise na amostra por título/compositor e use **Ouvir** ou **Baixar MIDI**. O painel pode ser recolhido sem recarregar o player. A configuração da fonte continua em `.env.local`; o índice fixo está em `vendor/spessasynth/library-sample.json`. Consulte `ETAPA-3B.md` e `PROGRESSO.md` para funcionamento e estado final.

## MIDI externo — Etapa 3A

A coleção externa está configurada em `.env.local`. Execute `npm start`, abra http://localhost:8181 e clique **Ouvir música de teste** para carregar `Borodin/bor_ps2.mid` sem upload. Consulte `ETAPA-3A.md` para configuração, segurança, testes e troca de coleção. Nenhum arquivo da coleção foi copiado para o projeto.

## Versão e requisitos

SpessaSynth **v4.4.0**, commit `1f95f3a737592fb78db9504a0152465f3d60c5d3`.
Node.js **24.22.1** (versão testada, também em `.nvmrc`), npm **11.19.1**, navegador Chromium ou Firefox com Web Audio. Os comandos da raiz usam sintaxe de ambiente Linux/POSIX.

## Instalar, compilar e iniciar

```bash
cd /home/djames/Documents/ClaveSol/SITE/clavesol-midi
npm run setup
npm run build
npm start
```

Abra **http://localhost:8181**. Se a porta estiver ocupada, o servidor oficial tenta a seguinte; consulte a URL no terminal. Pare com Ctrl+C. A instalação e a compilação já foram realizadas nesta entrega; para executar novamente basta `npm start`.

Clique na página para ativar o áudio, clique em **Upload your MIDI files** e selecione `demo/The HYBRID Collage (v2.0).mid`. Mantenha **GeneralUserGS.sf3** selecionada. O player inicia a demonstração com visualização animada e teclado virtual. Espaço pausa/retoma. Use navegador desktop para mais espaço nos painéis.

A primeira instalação requer internet. A demonstração local usa a SoundFont e o MIDI já baixados. Abra por HTTP localhost, não por file://. O comando da raiz limita o servidor ao computador local e desativa a atualização automática para preservar a revisão. Use sempre o comando da raiz.

Após editar os fontes, execute `npm run build`, reinicie o servidor e recarregue a página. O `npm start` oficial só compila automaticamente quando o servidor compilado ainda não existe; não é um watcher. Não é necessário usar o `dev` upstream, que espera checkouts irmãos das bibliotecas.

## Testes

```bash
npm test
npm run build
curl -fsS http://localhost:8181/getversion
curl -fsS http://localhost:8181/soundfonts
```

`npm test` executa o script oficial `test:types` (ESLint e TypeScript) e treze testes: seis da integração MIDI (`npm run test:midi`), dois da biblioteca (`npm run test:library`) e cinco do catálogo Python (`npm run test:catalog`); não há uma suíte unitária separada declarada no package.json desta revisão. `npm run build` inclui a verificação estática oficial. Os testes da rota externa são executados separadamente por `npm run test:midi`.

Resultados históricos da Etapa 1 (para a validação atual, consulte PROGRESSO.md):
- `npm ci`: sucesso, 163 pacotes instalados, zero vulnerabilidades reportadas pelo npm.
- Build oficial completo: sucesso; ESLint e TypeScript passaram. Bundles grandes geraram avisos informativos de tamanho, sem falha.
- HTTP: versão 4.4.0, listagem de GeneralUserGS.sf3 e AudioWorklet com resposta 200.
- Navegador integrado: SoundFont e MIDI oficial carregados; tempo avançando, vozes ativas, ondas, notas coloridas e teclado renderizados. Pausa por espaço manteve 00:34 e levou as vozes a zero; retomada avançou para 00:35 com vozes ativas.
- Painéis do sintetizador/mixer, instrumentos, efeitos GS/XG e configurações abertos. Menu de exportação apresentou WAV, vídeo, MIDI, SoundFont, DLS e RMI.
- Sem erros de console observados durante essa verificação; aviso de debug da edição de desenvolvimento.
- Exportação WAV iniciada, mas interrompida ao recarregar a página para evitar teste prolongado, conforme solicitação. Não foi validado arquivo de áudio exportado.
- Áudio nos alto-falantes não foi ouvido pelo agente. A atividade de síntese e a visualização foram observadas; confirmação auditiva permanece manual.

### Verificação manual breve

1. Carregue a demonstração e ouça alguns segundos; confirme áudio, notas em movimento e teclas iluminadas.
2. Pause/retome com espaço; experimente volume, posição e velocidade nos controles inferiores.
3. Abra Synthesizer controller: confira canais/instrumentos e efeitos; teste mute/solo ou um instrumento, se desejar.
4. Em Settings, confira Show notes, Show active notes, teclado e visualização. Os controles são os originais; os temas Clave Sol estão em Settings → Theme.
5. Opcional: em Export File, exporte WAV/MIDI e confira o arquivo. Vídeo, dispositivos MIDI físicos e todas as combinações de efeitos não foram testados nesta etapa.

Não é necessário aguardar os 2min33s da música para validar a demonstração.

## Organização

- `vendor/spessasynth/`: fontes oficiais completos, package-lock.json, licença Apache 2.0, documentação e SoundFont.
- `demo/`: um MIDI oficial e créditos originais.
- `package.json`: atalhos para instalar, compilar, iniciar e testar.
- `.nvmrc`, `.gitignore`, `UPSTREAM.md` e este README.
- Gerados localmente, ignorados pelo Git: `vendor/spessasynth/node_modules/`, `dist/`, `local-dev/`, `server/` e caches de compilação. O `server/config.json` contém preferências locais.

A licença e atribuições originais permanecem em `vendor/spessasynth/LICENSE`, README e fontes. Consulte `UPSTREAM.md` para procedência e as duas adaptações de execução do servidor. O repositório Clave Sol e seus templates não foram modificados. Não houve publicação ou configuração de domínio. A biblioteca está limitada à amostra da Etapa 3B, sem catálogo completo.
