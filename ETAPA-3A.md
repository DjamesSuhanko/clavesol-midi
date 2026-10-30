# Etapa 3A — Um MIDI externo no player completo

Checkpoint funcional da Etapa 2: `69caf7f`.

## Executar

```bash
cd /home/djames/Documents/ClaveSol/SITE/clavesol-midi
npm start
```

Abra http://localhost:8181 e clique **Ouvir música de teste**. Não é necessário clicar antes no título nem usar upload. O botão ativa o Web Audio no gesto do usuário, carrega a SoundFont e entrega um File ao mesmo `startMidi` usado pelo upload, que chama `Manager.play`. Visualização, teclado, sequenciador, mixer e exportações continuam sendo os originais. O botão de upload permanece disponível.

A configuração local já foi gravada em `.env.local`, ignorado pelo Git:

```dotenv
MIDI_SOURCE_DIR=/home/djames/Documents/MIDIS/Classic
MIDI_TEST_FILE="Borodin/bor_ps2.mid"
```

Foi localizado apenas o primeiro MIDI válido, numa busca incremental interrompida ao encontrá-lo. O caminho relativo foi fixado em MIDI_TEST_FILE para não repetir a busca nos próximos inícios. O arquivo original não foi copiado, renomeado, movido ou alterado. O nome interno mostrado pelo player é **Petite Suite**.

`scripts/start.mjs` carrega `.env.local`; variáveis já exportadas no ambiente têm precedência. Para outra coleção, altere MIDI_SOURCE_DIR e ajuste ou remova MIDI_TEST_FILE. Sem MIDI_TEST_FILE, a busca é recursiva, incremental, limitada a 256 entradas e 16 níveis, para no primeiro MIDI estruturalmente válido e guarda a escolha (ou falha) até reiniciar o servidor. Não há índice, ordenação da coleção, catálogo ou busca por nomes. A ordem inicial é a fornecida pelo sistema de arquivos.

Exemplo explícito, sem editar `.env.local`:

```bash
MIDI_SOURCE_DIR=/outra/colecao MIDI_TEST_FILE='Compositor/Obra.midi' npm start
```

Exemplo para selecionar um arquivo automaticamente em outra coleção:

```bash
MIDI_SOURCE_DIR=/outra/colecao MIDI_TEST_FILE='' npm start
```

Sem MIDI_SOURCE_DIR, clicar no botão apresenta orientação para configurar a variável e reiniciar; não há procura em outras pastas. `.env.example` documenta a configuração. Uma fonte por execução basta para esta etapa; múltiplas fontes e categorias ficam para etapas futuras.

## Rota local restrita

- GET `/clave-sol/midi-test`: nome original, caminho relativo e URL fixa do arquivo escolhido; não revela o caminho absoluto.
- GET `/clave-sol/midi-test/file`: somente o MIDI escolhido, com Content-Type audio/midi e nosniff.
- Não aceita caminhos, parâmetros de consulta ou outros métodos; esses pedidos são rejeitados.
- Extensões .mid/.midi, arquivo regular até 16 MiB e estrutura MThd/MTrk verificados. Parsing musical completo permanece no SpessaSynth.
- Confinamento por caminho relativo e realpath; links simbólicos para fora da raiz são rejeitados. Diretórios visitados são registrados para evitar ciclos.
- Cada leitura revalida o caminho e abre com O_NOFOLLOW. No Linux, o caminho do descritor aberto em /proc/self/fd também é verificado, antes da leitura, para detectar trocas de links/diretórios entre validação e abertura.
- O servidor de desenvolvimento continua restrito a 127.0.0.1. Não há acesso genérico à coleção pela URL, listagem de diretórios nem backend de produção.

## Testar e compilar

```bash
npm test            # ESLint + TypeScript oficiais e testes da rota
npm run test:midi   # Somente os 6 testes de integração/segurança
npm run build      # Build oficial, incluindo ESLint e TypeScript
```

Após alterar código de servidor, compile e reinicie `npm start`. Após mudar apenas `.env.local`, reinicie o servidor. Recarregue o navegador.

Resultados:
- Build oficial, ESLint e TypeScript: passaram; dependências e lockfile não alterados.
- 6 testes Node passaram: descoberta em subdiretório/nome Unicode; configuração ausente; traversal/caminho absoluto/formato inválido/link externo; link interno e substituição por externo; limite da busca; HTTP com rotas fixas/rejeição de parâmetros e POST.
- Arquivo real servido com HTTP 200, 14.162 bytes, idêntico à origem. SHA-256: `2c80a9ac596440de716d3f651efd94c0cabf197985d857f61d8c4185c61cb043`.
- Navegador: clique único a partir da página inicial, carregamento de Petite Suite, vozes ativas, notas animadas e teclado; pausa em 00:19, avanço para 01:28 e retomada. Sem erros de console observados.
- Sem escuta física dos alto-falantes; não se repetiram exportações longas nem se aguardou o término da música.

## Arquivos envolvidos

Novos: `.env.example`, `.env.local` (não versionado), `scripts/start.mjs`, `tests/midi-source.test.mjs`, `vendor/spessasynth/src/server/midi_source.ts`, `vendor/spessasynth/src/website/js/main/midi_test_button.ts` e este documento.

Integrações mínimas: `package.json`, `.gitignore`, `src/server/server.ts`, `src/website/js/main/local_main.ts`, `src/website/html/local_edition_index.html`, `src/website/css/themes/clavesol_ui.css`, README.md e UPSTREAM.md. Os caminhos src referem-se a vendor/spessasynth. Os novos estilos afetam apenas botão/status, usando as variáveis dos temas existentes.

Etapa encerrada aqui: nenhum catálogo, indexação integral, pesquisa, publicação ou etapa 3B.
