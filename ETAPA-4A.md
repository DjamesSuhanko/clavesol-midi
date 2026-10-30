# Etapa 4A — Gerador automático de catálogo

Gerador independente, manual e baseado somente na biblioteca padrão Python (Python 3.10+ em Linux/POSIX). Não altera o player, a biblioteca de 18 músicas, os temas ou os MIDIs originais. Não é chamado pelo servidor nem pelo navegador.

## Gerar ou atualizar

```bash
cd /home/djames/Documents/ClaveSol/SITE/clavesol-midi
MIDI_SOURCE_DIR=/home/djames/Documents/MIDIS/Classic python3 scripts/gerar_catalogo.py
```

Equivalente: `MIDI_SOURCE_DIR=/home/djames/Documents/MIDIS/Classic npm run catalog:generate`.

O script lê a variável de ambiente, mas **não carrega automaticamente `.env.local`**. Passe a variável como acima, exporte-a no terminal ou use `--source`. Sem configuração, encerra com orientação, sem pesquisar o computador.

Para futuras coleções, sem modificar o gerador:

```bash
MIDI_SOURCE_DIR=/caminho/da/outra/colecao python3 scripts/gerar_catalogo.py --collection outra
```

Opções: `--source DIRETORIO`, `--collection IDENTIFICADOR`, `--output-dir DESTINO`. O identificador deve usar letras minúsculas, números, hífen ou sublinhado e começar com letra/número. O destino deve ficar fora do acervo original. Os arquivos de saída são substituídos individualmente por escrita temporária e rename; se uma execução for interrompida entre as duas gravações, execute-a novamente para sincronizar catálogo e resumo.

## Saída estática

- `catalogs/classic/catalog.json`: array JSON completo de músicas.
- `catalogs/classic/summary.json`: resumo estatístico.

São metadados versionáveis, separados de vendor e das saídas descartáveis do build. Podem ser copiados para os assets de uma futura publicação estática. Não há caminhos absolutos, URLs locais, timestamps variáveis ou conteúdo MIDI nesses JSONs. A Etapa 4A não os conecta à interface, não copia MIDIs para hospedagem e não publica nada. O índice da 3B permanece intacto.

Cada música mantém os campos da 3B (`id`, `title`, `composer`, `relativePath`) e acrescenta:

| Campo | Significado |
| --- | --- |
| `hierarchy` | Array das pastas, da raiz até a pasta do arquivo |
| `fileName` | Nome original, inclusive extensão e capitalização |
| `sizeBytes` | Tamanho lógico em bytes |
| `collectionId` | Namespace estável da coleção |

O ID é `m` seguido do SHA-256 de `collectionId + NUL + relativePath`, compatível com os IDs alfanuméricos aceitos pelas rotas da 3B. Não depende do caminho absoluto, da ordem da busca, do tamanho ou da data do arquivo. Adicionar músicas não altera IDs existentes. Renomear/mover um arquivo dentro do acervo ou mudar collectionId altera o ID. Os IDs sequenciais da amostra não são reutilizados; a futura integração deverá carregar o novo array no lugar da amostra explicitamente.

Compositor: primeira pasta abaixo da raiz. Arquivos na raiz recebem `Compositor não identificado` e são contados separadamente. Esta convenção serve para coleções organizadas por compositor; não tenta inferir autoria pelo conteúdo. Título: nome sem extensão, com `_`/`-` convertidos em espaços e espaços repetidos reduzidos. Abreviações são preservadas, sem inventar nomes de obras.

A hierarquia e os nomes originais não são normalizados nem renomeados. `relativePath` usa `/`. Ordenação previsível por caminho relativo sem distinção de caixa, com caminho exato como desempate. Não há duplicação por execução; um registro por caminho relativo. Arquivos distintos com conteúdo igual permanecem distintos, pois podem representar edições/caminhos diferentes; não há deduplicação destrutiva por conteúdo.

O resumo contém total de músicas, compositores identificados, arquivos por compositor, músicas sem compositor, soma dos tamanhos e links ignorados. Não inclui espaço alocado pelo sistema de arquivos.

## Segurança e leitura

Extensões `.mid` e `.midi` em qualquer capitalização. Apenas arquivos regulares. Links simbólicos de arquivos e pastas (inclusive internos, quebrados ou cíclicos) são ignorados; uma raiz que seja link simbólico é rejeitada. A descida usa `os.fwalk` sem seguir links e consulta metadados pelo descritor da pasta. Não há leitura do conteúdo musical pelo gerador nem validação de eventos MIDI: trata-se de um catálogo por extensão. A validação musical de reprodução continua no player/servidor.

Erros de acesso interrompem a geração com erro em vez de gravar silenciosamente um catálogo incompleto. Execute com o acervo estável, sem mover arquivos durante a leitura. Gerar novamente substitui os metadados, incluindo novos arquivos e removendo entradas de arquivos excluídos.

## Validação realizada

- Acervo real: **337 músicas**, **26 compositores**, **27 diretórios incluindo a raiz**.
- Soma lógica: **8.116.500 bytes** (8,1165 MB decimais, aproximadamente 7,74 MiB). A diferença para os 8,6 MB de referência pode decorrer de espaço alocado e arquivos não MIDI.
- Contagem e conjunto de caminhos confirmados por levantamento independente com os.walk.
- Duas gerações consecutivas: catálogo e resumo idênticos byte a byte.
- SHA-256, tamanhos e mtimes dos MIDIs inalterados antes/depois da regeneração.
- Acervo real: profundidade máxima de uma pasta. Recursão em três níveis validada em fixture temporária.
- Cinco testes Python: subpastas/Unicode/espaços/caracteres especiais/extensões mistas/estatísticas; links externos/internos/ciclos/quebrados; IDs/ordenação/regeneração/namespaces; CLI/configuração/arquivos intactos/destino externo; fonte vazia/inválida e namespace inválido.
- `npm test`: inclui as verificações oficiais ESLint/TypeScript, os oito testes Node das etapas anteriores e os cinco testes Python.

```bash
npm run test:catalog
npm test
```

Sem mudança nos fontes do SpessaSynth, build ou interface nesta etapa; não foi necessário recompilar bundles inalterados. Estado final e resultados em PROGRESSO.md. Etapa 4B não iniciada.
