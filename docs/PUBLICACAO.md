# Publicação e operação

[Índice](../README.md) · [Categorias](CATEGORIAS.md) · [Arquitetura](ARQUITETURA.md)

O site é estático, hospedado no GitHub Pages. O servidor Node.js de desenvolvimento não participa da hospedagem. O repositório de destino é [DjamesSuhanko/clavesol-midi](https://github.com/DjamesSuhanko/clavesol-midi), branch `main`, e o domínio é [midi.clavesol.com.br](https://midi.clavesol.com.br).

## Instalação e comandos da raiz

Use Linux/POSIX, Node.js da `.nvmrc` (24.22.1), npm e Python 3.10+. Os scripts Python usam apenas a biblioteca padrão. Execute na raiz do checkout:

```bash
npm run setup
```

O comando executa `npm ci` em `vendor/spessasynth`, usando seu lockfile. Não é necessário atualizar dependências para atualizar o catálogo.

| Comando | Efeito |
| --- | --- |
| `npm run setup` | Instala as dependências fixadas do fornecedor. |
| `npm run build` | Executa ESLint/TypeScript oficiais e o build completo do fornecedor, inclusive saídas locais. Não prepara `dist/` da raiz. |
| `npm run build:pages` | Executa `build:fast` oficial e o empacotador Python, produzindo `dist/` da raiz. Não gera catálogos, não sincroniza os originais e não executa a suíte de testes. |
| `npm start` | Inicia o servidor local pelo wrapper; lê `.env.local`, restringe a escuta a `127.0.0.1` e desliga o atualizador automático upstream. |
| `npm run catalog:generate -- --collection ID` | Atalho para o gerador; parâmetros e origens em [Categorias](CATEGORIAS.md#comandos-do-gerador). |
| `npm test` | ESLint/TypeScript oficiais, testes MIDI, biblioteca e gerador. |
| `npm run test:midi` | Testes Node da leitura/rota MIDI local. |
| `npm run test:library` | Testes Node da biblioteca local. |
| `npm run test:catalog` | Testes Python do gerador. |

Os comandos de testes estão documentados para manutenção; **não foram executados nesta reorganização documental**, assim como nenhum build.

### Desenvolvimento com origens locais

Configure `categories.local.json` conforme [CATEGORIAS.md](CATEGORIAS.md). Para o modo legado de Clássicas, `.env.local` aceita:

```dotenv
MIDI_SOURCE_DIR=/caminho/para/acervos/Classic
# Opcional; usado apenas pela rota de teste mantida internamente:
# MIDI_TEST_FILE="Compositor/obra.mid"
```

O botão de teste está oculto na interface personalizada; use **Biblioteca de músicas**. Variáveis exportadas têm precedência sobre `.env.local`; a configuração de `MIDI_SOURCE_DIR` substitui a origem de Clássicas no mapa local.

```bash
npm run build
npm start
```

Abra a URL informada no terminal, inicialmente `http://localhost:8181`; se ocupada, o servidor tenta a próxima porta. O servidor também tenta abrir o navegador automaticamente. Encerre com Ctrl+C. `npm start` só compila automaticamente se o servidor compilado não existir: não é um watcher. Após mudar fontes, compile e reinicie; após mudar configurações ou catálogos, reinicie e recarregue a página.

## Atualizar músicas publicadas

O cadastro e as origens devem estar prontos. O procedimento completo para uma nova categoria está em [Adicionar Infantil](CATEGORIAS.md#adicionar-a-categoria-infantil).

```bash
# Atualiza os metadados de todas as categorias habilitadas.
env -u MIDI_SOURCE_DIR python3 scripts/gerar_catalogo.py --all
# Atualiza as cópias versionadas a partir desses metadados.
env -u MIDI_SOURCE_DIR python3 scripts/preparar_publicacao.py --sync-midis --sync-only
# Compila o player e monta a distribuição com as cópias versionadas.
npm run build:pages
```

Revise as alterações e faça commit de `categories.json` quando alterado, `catalogs/` e dos diretórios públicos afetados. Inclua também remoções de arquivos obsoletos. Não envie `categories.local.json`, `.env.local`, `dist/`, `work/` ou dependências. Faça push para `main` e publique manualmente.

Se não mudou o acervo, não é necessário regenerar ou sincronizar: `npm run build:pages` reconstrói a distribuição apenas com os arquivos do repositório. Alterações nos originais não chegam automaticamente à hospedagem.

### Parâmetros do empacotador

```bash
python3 scripts/preparar_publicacao.py [--sync-midis] [--sync-only] [--source DIRETORIO]
```

| Opção | Efeito |
| --- | --- |
| Sem opções | Lê os catálogos habilitados, o build existente em `vendor/spessasynth/local-dev/` e as cópias em `public/`; recria `dist/`. Não compila por conta própria. |
| `--sync-midis` | Antes do empacotamento, substitui as cópias gerenciadas das categorias habilitadas pelos arquivos dos catálogos, lidos nas origens externas. |
| `--sync-only` | Encerra após a sincronização, sem exigir build nem alterar `dist/`. Exige `--sync-midis`. |
| `--source DIRETORIO` | Sobrescreve somente a origem de `classic` durante a sincronização. O padrão é `MIDI_SOURCE_DIR`; outras categorias sempre usam o mapa local. Sem sincronização, não é utilizado. |
| `--help` | Exibe a ajuda. |

A sincronização verifica tamanho e igualdade SHA-256 dos bytes copiados; o empacotamento verifica caminhos e tamanhos das cópias versionadas. O catálogo não armazena hashes: uma edição de conteúdo com tamanho idêntico exige sincronização mesmo sem diferença visível nos metadados. Não modifique os originais durante a operação.

O empacotador inclui apenas entradas dos catálogos habilitados. Cópias residuais de categorias desativadas não entram na nova distribuição. Saídas são preparadas em `work/` e substituem os destinos gerenciados; não mantenha arquivos manuais em `dist/`.

### Conferência estática opcional

```bash
python3 -m http.server 8000 --bind 127.0.0.1 --directory dist
```

Abra `http://localhost:8000`, não `file://`. Isso verifica o mesmo transporte estático usado no Pages, sem o servidor Node ou os acervos externos. Encerre com Ctrl+C.

## Publicar no GitHub Pages

Workflow: **Publicar Clave Sol MIDI**, em [`.github/workflows/publicar.yml`](../.github/workflows/publicar.yml).

1. Envie os commits revisados para `main`.
2. No repositório GitHub, abra **Actions → Publicar Clave Sol MIDI → Run workflow**.
3. Selecione **main** e confirme a execução manual.
4. Acompanhe o job `publicar` e o ambiente `github-pages`.

O único gatilho é `workflow_dispatch`: pushes não iniciam publicação. O workflow faz checkout, configura Node pela `.nvmrc`, instala dependências com `npm run setup`, executa `npm run build:pages`, envia somente `dist/` como artefato e publica via `actions/deploy-pages`.

O Actions não gera o catálogo nem acessa diretórios externos. Todos os catálogos habilitados e MIDIs correspondentes precisam estar no commit selecionado. `categories.local.json` não é necessário. O workflow usa permissões `contents: read`, `pages: write` e `id-token: write`, com concorrência no grupo `pages` sem cancelar uma execução em andamento.

O `CNAME` versionado é copiado para `dist/`. O empacotador também usa o domínio nas metatags públicas. Nenhum script altera o DNS da Cloudflare. Esta documentação não executa deploy nem verifica o estado remoto de DNS/certificado.

### Script de configuração do GitHub

```bash
python3 scripts/configurar_github.py
```

Não possui parâmetros próprios. É uma operação remota, não um build nem um comando necessário a cada publicação. Requer `gh` autenticado, Git em `main` e árvore limpa, inclusive sem arquivos não rastreados.

O script cria o repositório público se ausente ou reutiliza o compatível; verifica `origin`, visibilidade, arquivamento, branch e configuração de Pages. Se houver histórico remoto, faz fetch e exige que `main` remota seja ancestral do HEAD local. Envia `main` sem force, configura a branch principal, Pages via workflow e o domínio fixado no script. Habilita HTTPS quando o certificado estiver aprovado. Interrompe diante das incompatibilidades verificadas; não mescla históricos, não altera DNS e não dispara o workflow.

## Diagnóstico breve

- **Categoria não cadastrada/desabilitada:** confira o ID e `enabled` no cadastro público.
- **Origem ausente ou errada:** confira o mapa local e as precedências; os scripts Python não carregam `.env.local`.
- **Catálogo ausente:** gere o índice da categoria habilitada antes de iniciar o servidor ou empacotar.
- **Cópia ausente/desatualizada:** regenere o catálogo, sincronize e versione os arquivos públicos antes do Actions.
- **Erro de SoundFont/inicialização:** confira na distribuição `soundfonts.json`, `soundfonts/GeneralUserGS.sf3` e os bundles originais. O tratamento de compressão e erros está descrito em [Arquitetura](ARQUITETURA.md#soundfont-e-inicialização).
