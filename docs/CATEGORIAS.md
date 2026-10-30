# Categorias e acervos MIDI

[Índice](../README.md) · [Publicação](PUBLICACAO.md) · [Arquitetura](ARQUITETURA.md)

A aplicação utiliza apenas categorias cadastradas e habilitadas. Não procura outras coleções no computador. A categoria atual é `classic` / **Clássicas**. Os exemplos de Infantil abaixo são instruções para um cadastro futuro, não uma categoria já existente.

Todos os comandos devem ser executados na raiz do projeto. Substitua os caminhos de exemplo pelos diretórios reais; os exemplos não contêm caminhos pessoais.

## Configuração pública: categories.json

Arquivo JSON versionado na raiz, composto por um array. Configuração atual completa:

```json
[
  { "id": "classic", "name": "Clássicas", "enabled": true }
]
```

| Campo | Regra e efeito |
| --- | --- |
| `id` | Identificador único e estável. Letras minúsculas, números, `_` e `-`; deve começar com letra ou número. Define o diretório do catálogo, o namespace dos IDs musicais e, nas novas categorias, as URLs dos MIDIs. |
| `name` | Texto não vazio mostrado na biblioteca. Pode conter espaços e acentos. |
| `enabled` | Booleano JSON `true` ou `false`, sem aspas. Somente categorias habilitadas participam da geração, do servidor local e do empacotamento. |

Não coloque caminhos de origem neste arquivo. A ordem do array determina a ordem de agregação das categorias. Trocar somente `name` muda o rótulo usado pelo servidor/empacotador; regenere também o catálogo para manter seus metadados coerentes. Alterar `id` muda a identidade das músicas e seus destinos; não o altere para simplesmente renomear o rótulo.

Uma categoria habilitada precisa ter `catalogs/<id>/catalog.json`, mesmo no servidor local. Categorias sem músicas não produzem grupos visíveis; o empacotador rejeita uma biblioteca total vazia. Desabilitar não apaga catálogos ou cópias antigas do Git, mas os exclui da próxima distribuição. Reinicie o servidor local após mudar o cadastro.

## Configuração privada: categories.local.json

Arquivo na raiz, ignorado pelo Git. É um objeto que associa cada `id` ao diretório externo correspondente:

```json
{
  "classic": "/caminho/para/acervos/Classic"
}
```

Use caminhos absolutos configurados para sua máquina, fora do projeto. Eles ficam somente neste arquivo local, nunca nos catálogos públicos. O JSON não expande `~`, `$HOME` nem outras variáveis: informe o caminho efetivo. Não cadastre raízes genéricas quando deseja apenas uma coleção.

Esse arquivo é necessário para gerar/sincronizar as categorias que não tenham uma origem explicitamente substituída. O GitHub Actions não o lê para montar a publicação: utiliza os catálogos e as cópias de MIDI já versionados.

### Precedência das origens

| Operação | Origem utilizada |
| --- | --- |
| Gerador de uma categoria | `--source`, depois `MIDI_SOURCE_DIR` exportada, depois a chave em `categories.local.json`. A variável substitui a origem de qualquer categoria selecionada. |
| Gerador com `--all` | Somente `categories.local.json`. Rejeita `--source`, `--output-dir` e uma `MIDI_SOURCE_DIR` não vazia. |
| Sincronização de publicação | Para `classic`: `--source`, variável exportada, configuração local. Outras categorias: sempre a configuração local. |
| `npm start` | Lê `.env.local`; variáveis já exportadas têm precedência. `MIDI_SOURCE_DIR` substitui apenas a origem de `classic`; demais categorias vêm da configuração local. |

Os scripts Python **não leem `.env.local`**. Para evitar que uma variável exportada da coleção Clássicas seja aplicada a Infantil, os procedimentos abaixo usam `env -u MIDI_SOURCE_DIR`. Para `npm start`, isso não impede que `.env.local` a reintroduza: remova ou ajuste a linha nesse arquivo quando quiser usar exclusivamente o mapa de categorias.

## Adicionar a categoria Infantil

1. Prepare um diretório externo contendo apenas o acervo autorizado. A primeira pasta abaixo da raiz será interpretada como compositor/grupo; pastas seguintes tornam-se subgrupos. Exemplo de organização:

   ```text
   Infantil/
     Autor Exemplo/
       Coleção A/
         Canção de exemplo.mid
   ```

   Não é obrigatório criar subpastas. Arquivos diretamente na raiz recebem `Compositor não identificado`. O gerador não infere autoria pelo conteúdo.

2. Edite `categories.json`, preservando Clássicas:

   ```json
   [
     { "id": "classic", "name": "Clássicas", "enabled": true },
     { "id": "infantil", "name": "Infantil", "enabled": true }
   ]
   ```

3. Crie ou atualize o arquivo local completo, sem versioná-lo:

   ```json
   {
     "classic": "/caminho/para/acervos/Classic",
     "infantil": "/caminho/para/acervos/Infantil"
   }
   ```

4. Gere o índice da nova categoria:

   ```bash
   env -u MIDI_SOURCE_DIR python3 scripts/gerar_catalogo.py --collection infantil
   ```

   Isso cria/substitui `catalogs/infantil/catalog.json` e `summary.json`. Não copia nem altera os MIDIs. Para atualizar todas as categorias habilitadas, use em vez disso:

   ```bash
   env -u MIDI_SOURCE_DIR python3 scripts/gerar_catalogo.py --all
   ```

5. Prepare as cópias versionadas:

   ```bash
   env -u MIDI_SOURCE_DIR python3 scripts/preparar_publicacao.py --sync-midis --sync-only
   ```

   O comando sincroniza **todas** as categorias habilitadas, não apenas Infantil. Todos os catálogos e diretórios de origem correspondentes precisam estar disponíveis. Clássicas continua em `public/midis/`; Infantil será copiada para `public/collections/infantil/midis/`, preservando nomes e subpastas. Cada destino gerenciado é substituído pelo conjunto listado no catálogo, removendo cópias obsoletas. Os originais não são alterados. A operação não é uma transação única entre categorias: uma falha posterior pode ocorrer depois de uma categoria anterior já ter sido sincronizada.

6. Prepare a distribuição, revise e versione:

   ```bash
   npm run build:pages
   git diff --stat
   git status --short
   git add categories.json catalogs/classic catalogs/infantil public/midis public/collections/infantil
   git commit -m "Adiciona categoria Infantil"
   git push origin main
   ```

   Revise os caminhos antes do `git add`; não inclua configurações locais. Os padrões atuais do `.gitignore` liberam `.mid` e `.midi` minúsculos nas áreas públicas. O gerador também aceita extensões maiúsculas, que podem aparecer normalmente como arquivos não rastreados: confira todas as cópias com `git status`.

7. Execute manualmente a publicação conforme [PUBLICACAO.md](PUBLICACAO.md#publicar-no-github-pages). Nenhuma alteração no código do player é necessária. Para conferir no servidor local, reinicie `npm start` e recarregue a página.

## Comandos do gerador

```bash
python3 scripts/gerar_catalogo.py [--collection ID] [--source DIRETORIO] [--output-dir DESTINO]
env -u MIDI_SOURCE_DIR python3 scripts/gerar_catalogo.py --all
npm run catalog:generate -- --collection classic
```

| Parâmetro | Comportamento |
| --- | --- |
| `--collection ID` | Seleciona uma categoria cadastrada e habilitada; padrão `classic`. Com `--all`, a seleção individual não é usada. |
| `--source DIRETORIO` | Substitui a origem para a geração individual; padrão inicial é a variável `MIDI_SOURCE_DIR`, com fallback para o mapa local. |
| `--output-dir DESTINO` | Grava `catalog.json` e `summary.json` nesse diretório; padrão `catalogs/<id>/`. Deve ficar fora do acervo. Destinos alternativos não são consumidos automaticamente pela biblioteca. |
| `--all` | Gera sequencialmente todas as categorias habilitadas nas saídas padrão. |
| `--help` | Exibe a ajuda, sem gerar catálogo. |

O gerador percorre recursivamente arquivos regulares `.mid`/`.midi`, sem diferenciar caixa. Ignora links simbólicos de arquivos e pastas; rejeita uma raiz que seja ela própria um link. Usa metadados, não valida eventos musicais nem lê o conteúdo dos MIDIs. Ordena por caminho relativo, sem distinguir caixa e com o caminho exato como desempate. Uma nova execução substitui os JSONs; não acrescenta duplicatas. Conteúdos iguais em caminhos diferentes continuam sendo músicas distintas.

O resumo informa `totalSongs`, `composerCount`, `filesByComposer`, `unidentifiedComposerSongs`, `totalSizeBytes` e `ignoredSymlinks`, além da versão do esquema e ID da coleção. Compositores são nomes de pastas, não uma validação musicológica. O tamanho é a soma lógica dos arquivos, não o espaço alocado no disco. Consulte o [esquema do catálogo](ARQUITETURA.md#catálogo-e-identidade).

## O que versionar

| Arquivo ou diretório | Tratamento |
| --- | --- |
| `categories.json` | Configuração pública editada manualmente; entra no Git. |
| `categories.local.json`, `.env.local` | Configurações locais; ignoradas, nunca devem entrar no Git. |
| `catalogs/<id>/catalog.json` e `summary.json` | Gerados automaticamente, mas versionados para o build do Actions. |
| `public/midis/`, `public/collections/<id>/midis/` | Cópias geradas pela sincronização, versionadas; não são os acervos originais. |
| Acervos externos | Permanecem na origem; não mover, renomear ou editar como parte da publicação. |
| `dist/`, `work/`, dependências e saídas do build em `vendor/spessasynth/` | Gerados e ignorados; não versionar. |

Desabilitar uma categoria não elimina suas cópias do histórico Git. A configuração atual não é um mecanismo de retirada de arquivos já publicados no passado.
