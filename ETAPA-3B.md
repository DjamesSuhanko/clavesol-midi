# Etapa 3B — Biblioteca inicial concluída

Checkpoint anterior: `0a4d9fa` (Etapa 3A). A retomada preservou a implementação existente; não houve reimplementação nem alteração de dependências.

## Executar

```bash
cd /home/djames/Documents/ClaveSol/SITE/clavesol-midi
npm start
```

Abra http://localhost:8181 (ou a porta indicada pelo terminal) e clique **Biblioteca de músicas**. Pesquise por título ou compositor, selecione **Ouvir** ou **Baixar MIDI**. **Fechar biblioteca**, o botão de abertura e Escape recolhem o painel. No celular, recolha-o para liberar a visualização musical. Abrir/fechar apenas altera visibilidade e foco, sem chamar pausa ou recarregar a música.

O arquivo `.env.local`, ignorado pelo Git, mantém:

```dotenv
MIDI_SOURCE_DIR=/home/djames/Documents/MIDIS/Classic
MIDI_TEST_FILE="Borodin/bor_ps2.mid"
```

MIDI_TEST_FILE continua servindo ao botão de teste da 3A. A biblioteca usa seus próprios 18 caminhos relativos em `vendor/spessasynth/library-sample.json`. Ao trocar MIDI_SOURCE_DIR, ajuste os caminhos desse índice e reinicie o servidor. Não há busca automática de substitutos nem varredura da coleção no carregamento da biblioteca.

## Funcionamento e limites

- Amostra fixa: 18 músicas de 18 compositores. Títulos derivados dos nomes dos arquivos, com separadores substituídos por espaços; abreviações originais são mantidas, sem inventar nomes de obras.
- Pesquisa no navegador, somente na amostra, ignorando maiúsculas e acentos.
- Ouvir reutiliza a ativação de áudio e startMidi/Manager.play da 3A. Nenhuma reprodução é solicitada ao simplesmente abrir o painel; o carregamento depende do clique em Ouvir e das permissões de áudio do navegador.
- Download entrega os bytes originais e o nome original via Content-Disposition UTF-8, sem conversão.
- GET `/clave-sol/library` lista metadados. GET `/clave-sol/library/<id>/file` reproduz; GET `/clave-sol/library/<id>/download` baixa. IDs só correspondem a entradas do índice local; caminhos arbitrários, parâmetros e outros métodos são rejeitados.
- As leituras reutilizam readMidi: extensão e estrutura MIDI, tamanho máximo, realpath, confinamento na raiz e proteção contra links externos verificados novamente a cada requisição.
- Painel lateral em desktop e recolhível no celular. Sintetizador, visualização, teclado, mixer, upload e exportações originais permanecem disponíveis; temas Clave Sol preservados.
- Nenhum MIDI original copiado, modificado ou incluído no Git. Sem indexação completa, paginação ou backend de produção.

## Arquivos da etapa

Novos:
- `vendor/spessasynth/library-sample.json`: índice da amostra.
- `vendor/spessasynth/src/server/midi_library.ts`: rotas por ID e download.
- `vendor/spessasynth/src/website/js/main/midi_library.ts`: painel, seleção e pesquisa.
- `tests/library.test.mjs`: testes da biblioteca.
- `PROGRESSO.md` e `ETAPA-3B.md`: progresso e entrega.

Alterados:
- `package.json`: scripts de testes.
- `vendor/spessasynth/src/server/server.ts`: carregamento do índice e registro das rotas.
- `vendor/spessasynth/src/build/build_script.ts`: inclusão do JSON no pacote local gerado.
- `vendor/spessasynth/src/website/js/main/local_main.ts`: compartilhamento do carregador da 3A.
- `vendor/spessasynth/src/website/html/local_edition_index.html`: abertura e estrutura do painel.
- `vendor/spessasynth/src/website/css/themes/clavesol_ui.css`: estilos restritos à biblioteca.
- `README.md` e `UPSTREAM.md`: documentação atualizada.

## Verificação

```bash
npm test
npm run build
```

`npm test` executa ESLint/TypeScript oficiais, seis testes da 3A e dois da biblioteca. Estes cobrem índice com IDs únicos, distribuição por compositor, listagem HTTP, reprodução/download com bytes idênticos, nome UTF-8, IDs desconhecidos, arquivo ausente, parâmetros manipulados, método inválido e link externo. `npm run build` compila o aplicativo completo e inclui as verificações estáticas oficiais.

Na retomada, o usuário confirmou manualmente: biblioteca com compositores, pesquisa, seleção do MIDI correto, visualização animada e download com nome original. Esses testes não foram repetidos pelo agente. Os handlers de abertura/fechamento foram revisados e não controlam a reprodução; não se registra um novo teste visual dessa interação nesta retomada.

Resultado final dos comandos registrado em PROGRESSO.md. Nenhuma publicação. Etapa 4 não iniciada.
