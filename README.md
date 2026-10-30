# Clave Sol MIDI

Biblioteca de músicas MIDI com pesquisa, reprodução, download do arquivo original e navegação por categoria, compositor e subpastas. Utiliza o **SpessaSynth Web App completo**, com identidade Clave Sol, temas claro e escuro, visualização animada das notas, teclado virtual, mixer, efeitos e exportações.

Site: [midi.clavesol.com.br](https://midi.clavesol.com.br). O catálogo versionado de Clássicas contém 337 músicas; os 26 compositores/grupos são derivados dos nomes das pastas.

## Documentação

- [Categorias e acervos](docs/CATEGORIAS.md): configurações completas, cadastro de Infantil, geração dos índices e sincronização dos MIDIs.
- [Publicação e operação](docs/PUBLICACAO.md): instalação, comandos, atualização das músicas, distribuição estática e GitHub Pages manual.
- [Arquitetura e procedência](docs/ARQUITETURA.md): integração com SpessaSynth, transporte local/estático, esquema do catálogo, segurança, temas e licenças.
- [Registro de consolidação](PROGRESSO.md): estado desta organização documental. O histórico detalhado das etapas anteriores permanece no Git.

## Início rápido

Execute os comandos na raiz do checkout. Requisitos: Node.js indicado em `.nvmrc` (24.22.1), npm e Python 3.10+ em Linux/POSIX.

```bash
npm run setup
npm run build:pages
python3 -m http.server 8000 --bind 127.0.0.1 --directory dist
```

Abra [localhost:8000](http://localhost:8000). Esse modo usa as cópias MIDI já versionadas e não exige acesso aos acervos originais. Para desenvolvimento com `npm start`, configure as origens conforme os guias.

O envio de commits **não publica o site**. A publicação exige executar manualmente o workflow **Publicar Clave Sol MIDI**.

## Licenças

SpessaSynth v4.4.0, sob [Apache 2.0](vendor/spessasynth/LICENSE). Créditos, revisão de origem e termos dos recursos estão descritos em [Arquitetura — procedência e licenças](docs/ARQUITETURA.md#procedência-e-licenças). A licença do aplicativo não substitui os termos dos MIDIs, SoundFont ou fontes tipográficas.
