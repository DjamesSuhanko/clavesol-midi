# Arquitetura e procedência

[Índice](../README.md) · [Categorias](CATEGORIAS.md) · [Publicação](PUBLICACAO.md)

## Visão geral

O projeto mantém o SpessaSynth Web App completo em `vendor/spessasynth/`, sem submódulo. A biblioteca Clave Sol acrescenta seleção, pesquisa e download; entrega o MIDI ao carregador original, sem implementar outro sintetizador, sequenciador ou renderer.

```text
categories.json + categories.local.json + acervos externos
                     |
              gerar_catalogo.py (manual)
                     |
          catalogs/<id>/catalog.json + summary.json
                     |
        +------------+--------------------------------+
        |                                             |
 servidor Node local                     preparar_publicacao.py --sync-midis
 catálogo + origens externas                            |
 /clave-sol/library                         cópias versionadas em public/
 /<id>/file e /<id>/download                            |
        |                                  build oficial + empacotamento
        |                                             |
        |                                   dist/library.json + MIDIs
        +-------------------+-------------------------+
                            |
                biblioteca no navegador
                            |
                    File → startMidi
                            |
            Manager.play do SpessaSynth original
```

O catálogo é gerado manualmente, não a cada acesso. O servidor lê configurações/índices ao iniciar; a interface busca a lista na primeira abertura bem-sucedida do painel e a mantém em memória. Recarregue a página para obter uma lista atualizada.

## Arquivos principais

| Caminho | Responsabilidade |
| --- | --- |
| `categories.json` | Cadastro público e habilitação de categorias. |
| `categories.local.json` | Mapa privado de origens, ignorado pelo Git. |
| `scripts/categories.py` | Leitura/validação do cadastro Python, resolução das origens e prefixos de publicação. |
| `scripts/gerar_catalogo.py` | Índices recursivos e estatísticas. |
| `scripts/preparar_publicacao.py` | Sincronização opcional das cópias e distribuição estática. |
| `scripts/start.mjs` | Ambiente e início do servidor local. |
| `vendor/spessasynth/src/server/midi_library.ts` | Listagem e entrega de MIDI por ID. |
| `vendor/spessasynth/src/server/midi_source.ts` | Leitura confinada e validação MIDI local; rota de teste legada. |
| `vendor/spessasynth/src/website/js/main/midi_library.ts` | Painel, grupos, pesquisa, ouvir e download. |
| `vendor/spessasynth/src/website/js/main/local_main.ts` | Inicialização nativa e ligação da biblioteca ao carregador. |
| `vendor/spessasynth/src/website/js/main/static_mode.ts` | Detecção estática e persistência de preferências no navegador. |
| `vendor/spessasynth/src/website/js/main/soundfont_download.ts` | Leitura da SoundFont, com progresso e suporte a respostas comprimidas. |

`vendor/spessasynth/library-sample.json` e a integração de teste permanecem como artefatos legados, mas a biblioteca atual lê os catálogos das categorias. Não use a amostra para atualizar músicas.

## Catálogo e identidade

`catalogs/<id>/catalog.json` contém um array de músicas:

| Campo | Conteúdo |
| --- | --- |
| `id` | `m` seguido de SHA-256 de `collectionId + NUL + relativePath`, codificado em UTF-8. |
| `title` | Nome sem extensão, `_`/`-` substituídos por espaços e espaços repetidos reduzidos. |
| `composer` | Primeira pasta relativa, ou `Compositor não identificado`. |
| `relativePath` | Caminho relativo preservado, com `/`. |
| `hierarchy` | Array de todas as pastas entre raiz e arquivo. |
| `fileName` | Nome original com extensão e capitalização. |
| `sizeBytes` | Tamanho lógico do arquivo. |
| `collectionId` | Namespace da coleção, igual ao ID da categoria gerada. |
| `categoryId`, `categoryName` | Categoria e rótulo público. Servidor/empacotador aplicam os valores atuais do cadastro. |

IDs independem da localização absoluta da raiz, do conteúdo, do tamanho e da ordem de descoberta. Mover ou renomear um arquivo dentro da coleção, ou mudar o ID da coleção, altera a identidade. Coleções distintas com o mesmo caminho relativo têm IDs diferentes. Não há deduplicação por conteúdo.

Os índices não incluem caminhos absolutos nem timestamps. A ordenação é determinística para um acervo estável. O gerador substitui cada JSON por arquivo temporário; a geração de vários catálogos não é uma transação única. Falhas de leitura interrompem a operação. O resumo separado contém estatísticas, não é usado pela interface. O resumo atual de Clássicas registra 337 músicas, 26 nomes de pastas interpretados como compositores e 8.116.500 bytes; não foi recalculado nesta tarefa documental.

## Biblioteca e reprodução

A navegação é **categoria → compositor/pastas → subpastas → música**. As categorias mostram o total de músicas da categoria, mesmo durante uma pesquisa. O contador geral mostra resultados e total. Pastas sem músicas não são desenhadas.

A pesquisa filtra título e compositor no navegador, ignorando caixa e acentos; não pesquisa categoria nem conteúdo MIDI. Com pesquisa ativa, abre os grupos que contêm resultados, mesmo que antes estivessem recolhidos. O estado de expansão fica em memória, não em armazenamento persistente.

**Ouvir** prepara o áudio, busca `song.url`, cria um `File` com o nome original e chama a função compartilhada `startMidi`, que entrega os bytes a `Manager.play`. **Baixar MIDI** usa `downloadUrl` e o nome original. Não há conversão. Abrir, fechar ou navegar no painel não chama pausa nem reinicializa o player; os eventos de teclado no painel não acionam os atalhos musicais.

## Transporte local e segurança

O servidor oferece:

- `GET /clave-sol/library`: metadados das músicas habilitadas e URLs por ID.
- `GET /clave-sol/library/<id>/file`: bytes para reprodução.
- `GET /clave-sol/library/<id>/download`: bytes com `Content-Disposition` UTF-8 para download.

Os IDs precisam existir nos catálogos carregados; a rota não aceita caminhos fornecidos pelo cliente, parâmetros extras ou outros métodos. A origem depende da categoria. `readMidi` verifica extensão, estrutura básica MThd/MTrk, arquivo regular e limite de 16 MiB; confina o caminho resolvido na raiz. Links para fora são rejeitados, e a leitura inclui `O_NOFOLLOW` e conferência do descritor em Linux. Links internos podem ser lidos pela rota, embora o gerador ignore links durante a indexação.

Algumas mensagens legadas ainda dizem “amostra” e a orientação de ausência de fonte menciona `.env.local`; isso não significa que a lista atual seja limitada à amostra. Sem qualquer fonte configurada, a rota retorna 503; fonte/arquivo inválido na entrega resulta em 404.

A rota legada `/clave-sol/midi-test` permanece internamente, com seleção por `MIDI_TEST_FILE` ou descoberta limitada, mas seu botão está oculto. A biblioteca não a utiliza para selecionar músicas. O servidor local é uma ferramenta de desenvolvimento, não um backend de produção.

## Transporte estático e distribuição

O empacotador marca o HTML com `data-hosting="static"`. Nesse modo, a biblioteca lê `library.json`, a versão vem de `version.txt` e as preferências usam `localStorage` (`clavesol-midi-settings`), com tolerância à indisponibilidade do armazenamento. Não depende das rotas Node para essas operações.

`dist/library.json` agrega os catálogos habilitados e acrescenta `url` e `downloadUrl`. Ambos apontam para o mesmo arquivo estático, com percent-encoding dos nomes:

- Clássicas: `midis/<caminho relativo>`.
- Demais categorias: `collections/<id>/midis/<caminho relativo>`.

O atributo HTML `download` solicita o nome original ao navegador. O servidor estático não acessa o sistema de arquivos original: publica somente as cópias empacotadas. O empacotador rejeita caminhos absolutos, `..`, links sob a raiz de cópia e arquivos que escapem dela; não oferece uma API de caminhos arbitrários.

O build oficial gera `vendor/spessasynth/local-dev/`. O empacotador copia seus arquivos de primeiro nível, exceto `.map` e `.html`, e transforma `local_edition_index.html` em `dist/index.html`, aplicando título e metadados Clave Sol. A distribuição inclui bundles/workers/recursos, MIDIs, `library.json`, `test-song.json` legado, `soundfonts.json`, GeneralUserGS, `version.txt`, `CNAME`, `.nojekyll`, licença/README upstream e licenças de fontes. Não copia dependências de desenvolvimento, servidor Node ou configurações pessoais.

## SoundFont e inicialização

O manifesto estático é `[{"name":"GeneralUserGS.sf3"}]`. `local_main.ts` resolve esse nome em `soundfonts/GeneralUserGS.sf3` relativo à página, baixa automaticamente o banco e aguarda a inicialização do `Manager`. A saída audível pode depender do gesto de **Ouvir**, conforme a política Web Audio do navegador.

`readSoundFont` acumula os chunks e aloca o buffer pelo total efetivamente recebido. Isso evita o erro anterior ao usar `Content-Length` comprimido para dimensionar bytes já descomprimidos pelo fetch. Com compressão/tamanho desconhecido, o progresso é indeterminado. O decoder SF3/Vorbis/WASM faz parte dos bundles originais, incluindo o worker e o processador; não há um decoder externo a configurar.

O bootstrap trata rejeições, erros HTTP e limites de tempo; aguarda `manager.ready` antes de encerrar o progresso normal. Em falha, apresenta orientação em português para verificar conexão e recarregar, em vez de manter “Loading soundfont...” indefinidamente.

## Identidade visual e recursos preservados

Os temas nativos **Clave Sol — Claro** e **Clave Sol — Escuro** estão registrados em `js/themes/theme_list.ts`, com arquivos em `css/themes/` dentro de `vendor/spessasynth/src/website/`. O claro é o padrão para novas preferências. DM Sans e Playfair Display são incorporadas localmente com licenças OFL. A área musical escura e as cores distintas dos canais foram mantidas.

`clavesol_ui.css` limita os ajustes à interface Clave Sol e oculta upload, seletor/controle extra de SoundFont, links promocionais e controles temporários de teste. A integração preserva os elementos necessários ao código upstream. O empacotamento também retira links promocionais do HTML público. A biblioteca é o ponto de seleção visível; sintetizador, teclado, mixer, visualização, controles e exportações continuam os do SpessaSynth.

## Procedência e licenças

SpessaSynth oficial: [spessasus/SpessaSynth](https://github.com/spessasus/SpessaSynth), tag **v4.4.0**, commit **1f95f3a737592fb78db9504a0152465f3d60c5d3**. Importado com `git archive`, sem submódulo ou repositório Git aninhado. A licença Apache 2.0 e atribuições permanecem em [vendor/spessasynth/LICENSE](../vendor/spessasynth/LICENSE), README e fontes. Instale pelo lockfile, sem resolver novamente os seletores `latest` do package.json.

A GeneralUserGS.sf3 é de S. Christian Collins; seus créditos e termos incorporados permanecem no banco. O MIDI de demonstração `demo/The HYBRID Collage (v2.0).mid` veio de [spessasynth-demo-songs](https://github.com/spessasus/spessasynth-demo-songs), commit **58f3bc63269a621f9baedb819752408c51d9c38a**. Créditos em [demo/UPSTREAM-README.md](../demo/UPSTREAM-README.md). Esse arquivo não constitui uma categoria da biblioteca. A licença do aplicativo não relicencia MIDIs, SoundFont ou fontes.

Para atualizar o fornecedor, compare com a revisão registrada e preserve as integrações de transporte, temas, biblioteca, inicialização e opções de execução local. O wrapper da raiz desativa o atualizador automático para impedir a substituição desse checkout personalizado. O site principal Clave Sol é independente.

## Histórico documental

As antigas instruções de etapas e o guia de publicação da raiz foram consolidados nestes três guias. Informações anteriores sobre biblioteca de 18 músicas, upload visível, botão de teste visível e primeira publicação pendente não descrevem mais o projeto atual. Os registros completos, checkpoints e resultados históricos permanecem no histórico Git, sem serem apresentados como procedimentos vigentes.
