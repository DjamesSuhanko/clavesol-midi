# Catálogo completo e publicação manual

A biblioteca local passa a ler `catalogs/classic/catalog.json` (337 músicas), em vez de `vendor/spessasynth/library-sample.json`. A pesquisa, navegação, controles e visualização permanecem os existentes.


## Categorias — Etapa 5

A configuração pública `categories.json` cadastra apenas `classic` / **Clássicas** / `enabled: true`. As origens ficam separadas em `categories.local.json` (ignorado pelo Git), atualmente `{"classic": "/home/djames/Documents/MIDIS/Classic"}`. Nenhuma descoberta de acervos é feita. Somente IDs cadastrados e habilitados são gerados, servidos e publicados.

A biblioteca apresenta **Clássicas (337) → compositor → subpastas → música**. Categorias e pastas podem ser recolhidas. A pesquisa continua sobre todas as músicas e abre os grupos com resultados, sem depender do estado recolhido. IDs, nomes, caminhos relativos e URLs de Clássicas foram preservados; apenas `categoryId` e `categoryName` foram acrescentados ao catálogo existente. Nenhum segundo catálogo-fonte foi criado.

Atualizar somente Clássicas (comando anterior preservado):

```bash
MIDI_SOURCE_DIR=/home/djames/Documents/MIDIS/Classic python3 scripts/gerar_catalogo.py
```

Atualizar todas as categorias explicitamente habilitadas, usando suas origens locais:

```bash
env -u MIDI_SOURCE_DIR python3 scripts/gerar_catalogo.py --all
python3 scripts/preparar_publicacao.py --sync-midis --sync-only
npm run build:pages
```

Nesta etapa não foi executada nova sincronização dos originais: a publicação reutilizou os MIDIs já versionados. Ao adicionar arquivos futuramente, o comando de sincronização continua preparando a cópia de publicação, sem alterar a origem.

**Exemplo futuro — não cadastrado agora:** para adicionar Infantil, acrescente `{"id":"infantil","name":"Infantil","enabled":true}` ao array de `categories.json` e informe `"infantil":"/caminho/especifico/do/acervo/infantil"` no objeto de `categories.local.json`. Gere com `python3 scripts/gerar_catalogo.py --collection infantil` (sem MIDI_SOURCE_DIR de outra categoria), ou use o comando `--all` acima; depois sincronize e compile. Isso produz `catalogs/infantil/` e cópias/URLs sob `public/collections/infantil/midis/` / `collections/infantil/midis/`. Clássicas permanece em `public/midis/` / `midis/`. Os namespaces dos IDs e das URLs evitam colisões entre nomes iguais de coleções distintas.

Para desativar uma categoria, use `enabled:false`: ela deixa de participar da geração e da próxima distribuição, mesmo que cópias antigas ainda existam no repositório. Não são criadas categorias visíveis sem músicas.

Versione a configuração pública, catálogos e cópias necessárias, nunca `categories.local.json`. O Actions usa somente esses arquivos versionados e o workflow atual permanece inalterado e manual. Não há diretórios locais no JSON publicado.

## Atualizar músicas

```bash
cd /home/djames/Documents/ClaveSol/SITE/clavesol-midi
MIDI_SOURCE_DIR=/home/djames/Documents/MIDIS/Classic python3 scripts/gerar_catalogo.py
MIDI_SOURCE_DIR=/home/djames/Documents/MIDIS/Classic python3 scripts/preparar_publicacao.py --sync-midis --sync-only
npm run build:pages
```

O primeiro comando atualiza os metadados. O segundo copia somente os arquivos do catálogo para `public/midis`, preservando nomes, pastas e bytes; substitui essa cópia gerenciada, eliminando entradas antigas. Os originais não são alterados. O terceiro executa o build oficial rápido e prepara `dist/` para hospedagem estática. Não gera outro player nem recompila bibliotecas por conta própria.

Após revisar, faça commit de `catalogs/classic/` e `public/midis/`, envie main e execute manualmente o workflow. Caso precise apenas reconstruir uma versão já versionada, use `npm run build:pages` sem informar MIDI_SOURCE_DIR. No GitHub Actions nenhum caminho do computador é usado.

A inclusão de MIDI em Git é uma exceção deliberada para `public/midis/`, autorizada nesta etapa de publicação. As restrições anteriores de não copiar o acervo continuam valendo para os originais e para outras pastas. `dist/`, node_modules, configurações locais e arquivos temporários permanecem ignorados.

## Estrutura publicada

`dist/` é o único artefato enviado ao Pages. Contém HTML/CSS/JS e workers do build oficial, SoundFont GeneralUserGS, fontes incorporadas/licenças, metadados estáticos e `midis/<compositor>/<nome original>`.

O empacotador produz `library.json` com URLs relativas e percent-encoding dos nomes, `test-song.json`, `soundfonts.json`, `version.txt`, `CNAME` e `.nojekyll`. Todos os recursos de reprodução/exportação permanecem no player original. A configuração de hospedagem estática altera somente o transporte: não chama rotas Node; preferências ficam em localStorage com fallback em memória quando indisponível. A SoundFont inclusa e a abertura de bancos extras continuam disponíveis; diretórios SoundFont do computador não existem no servidor estático.

A reprodução e o download usam o mesmo arquivo estático; o atributo download mantém o nome original. O modo local continua usando as rotas protegidas, com MIDI_SOURCE_DIR em `.env.local` e `npm start`. Reinicie o servidor local após atualizar o build do servidor.

Opcionalmente, para sua verificação visual local:

```bash
python3 -m http.server 8000 --bind 127.0.0.1 --directory dist
```

## GitHub

Repositório: `DjamesSuhanko/clavesol-midi`, público, branch `main`.
Domínio configurado: `midi.clavesol.com.br`.

```bash
python3 scripts/configurar_github.py
```

Requer gh autenticado e árvore Git limpa com os arquivos revisados/commitados. Cria o remoto se ausente, reutiliza se compatível, verifica origin, visibilidade, Pages e ancestralidade antes de enviar main. Não faz force push, não substitui históricos divergentes nem dispara Actions. Pode ser repetido após novos commits.

Workflow: **Publicar Clave Sol MIDI**, arquivo `.github/workflows/publicar.yml`.
Gatilho exclusivo: **workflow_dispatch**. Pushes não publicam.

No GitHub: Actions → Publicar Clave Sol MIDI → Run workflow → main. O workflow instala o lockfile oficial, usa Node da `.nvmrc`, compila, prepara dist e publica via Pages. Os workflows preservados dentro de vendor são apenas arquivos do fornecedor; GitHub só executa os workflows na pasta `.github/workflows` da raiz.

O DNS da Cloudflare não é alterado por nenhum script. Para o domínio responder, o DNS deve apontar para o Pages; a situação de DNS/certificado depende da configuração existente. O script habilita Enforce HTTPS quando o certificado estiver aprovado. Nesta preparação, o GitHub informou certificado aprovado e HTTPS obrigatório foi habilitado. O primeiro deploy permanece manual.

## Verificação desta preparação

Executado apenas `npm run build:pages` e conferência leve do empacotamento: 337 URLs locais válidas, arquivos distribuídos idênticos por SHA-256 aos originais, SoundFont presente, sem node_modules ou sourcemaps no artefato. Sem testes visuais, navegador ou suítes extensas. Não foi executado o workflow.

## Estado remoto confirmado

Repositório público criado e código enviado à main. Pages configurado com build_type=workflow e CNAME midi.clavesol.com.br. Certificado aprovado pelo GitHub; Enforce HTTPS habilitado. Consulta a Actions: zero execuções. Nenhuma mudança no DNS. O site só terá seu primeiro artefato publicado quando o proprietário executar Publicar Clave Sol MIDI manualmente.

## Correção da inicialização e limpeza da interface

A resposta publicada de GeneralUserGS.sf3 chega com `Content-Encoding: gzip`: o Content-Length observado era 4.825.200 bytes, enquanto o fetch descomprimido entrega 8.423.728 bytes. O leitor anterior pré-alocava pelo cabeçalho e lançava RangeError ao preencher o buffer; a rejeição não tratada interrompia a instalação dos controles e deixava Loading soundfont na tela.

`soundfont_download.ts` agora acumula os chunks recebidos, dimensionando o buffer pelo tamanho real. Content-Length só orienta o progresso quando não há compressão; com tamanho desconhecido o indicador é indeterminado. A URL continua soundfonts/GeneralUserGS.sf3 e o manifesto continua um array de objetos com name, ambos corretos. O decoder WASM/Vorbis já está incorporado em worker.js e spessasynth_processor.min.js: não faltava um arquivo externo.

O bootstrap aguarda a inicialização nativa automaticamente, mesmo com AudioContext suspenso, sem exigir clique para baixar/preparar o banco. A saída audível continua sujeita à política do navegador e é liberada pelo gesto normal de Ouvir. A barra só sai após manager.ready; falhas/rejeições/timeouts mostram orientação de erro em português. Nenhum mecanismo de síntese foi substituído.

A classe clavesol_player oculta via CSS upload, seletor e botão extra de SoundFont, links GitHub/Discord e botão/status temporários de teste. DOM e mecanismos internos permanecem presentes; biblioteca e exportação não são ocultadas.

Validação sem navegador: build:pages concluído; leitura gzip servindo o arquivo de dist com igualdade de bytes; ausência de Content-Length e erro HTTP tratados; primeira amostra SF3 decodificada pelo decoder original (13.847 frames); presença do WASM em ambos os backends; catálogo com 337 músicas. Sem suítes extensas ou teste visual. O workflow permanece manual e não foi executado pelo agente.
