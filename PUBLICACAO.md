# Catálogo completo e publicação manual

A biblioteca local passa a ler `catalogs/classic/catalog.json` (337 músicas), em vez de `vendor/spessasynth/library-sample.json`. A pesquisa, navegação, controles e visualização permanecem os existentes.

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

O DNS da Cloudflare não é alterado por nenhum script. Para o domínio responder, o DNS deve apontar para o Pages; a situação de DNS/certificado depende da configuração existente. A opção Enforce HTTPS só poderá ser habilitada quando o GitHub emitir o certificado. O primeiro deploy permanece manual.

## Verificação desta preparação

Executado apenas `npm run build:pages` e conferência leve do empacotamento: 337 URLs locais válidas, arquivos distribuídos idênticos por SHA-256 aos originais, SoundFont presente, sem node_modules ou sourcemaps no artefato. Sem testes visuais, navegador ou suítes extensas. Não foi executado o workflow.
