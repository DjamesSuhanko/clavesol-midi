# Etapa 2 — Temas Clave Sol

Checkpoint da Etapa 1: `528ef86` (commit local, anterior às alterações).

## Identidade e implementação

Referências lidas, sem modificações: `../clavesol/assets/style.css` e `../clavesol/templates/hinario-site/site_layout.py`. O site publicado não pôde ser acessado pela ferramenta web; a implementação usa os fontes locais fornecidos.

Paleta real: papel #f7f6f0, painéis #fcfcf8, tinta #173b34, verde #173f35, linhas #d8ded5, dourado #a66b24, foco #b67a30. O escuro reaproveita #1b2924, #071c17, #285e49, #476a52 e #e2bd7c presentes no mesmo CSS. Fontes DM Sans e Playfair Display, distribuídas localmente no CSS com suas licenças OFL, sem chamadas externas em tempo de execução.

Novos temas nativos: **Clave Sol — Claro** (padrão para novas configurações) e **Clave Sol — Escuro**. Preferências antigas são respeitadas: selecione em **Settings → Theme** se o tema original continuar aparecendo. Todos os temas upstream permanecem disponíveis.

Ambos conservam a área musical escura e as 16 cores originais dos canais. O campo nativo `type` é `dark` em ambos porque controla o brilho das notas ativas, não a cor dos painéis; assim, alternar claro/escuro não desativa esse recurso. Nenhum código do renderer foi alterado.

Personalizados: fundos, painéis, seletores, botões, barras/progresso, ícones de reprodução, mixer, configurações, notificações, tipografia, bordas e foco. Layouts e breakpoints do upstream mantidos. Não foi alterado o sintetizador, teclado, sequenciador ou exportadores.

## Arquivos

Sob `vendor/spessasynth/src/website/`:
- `css/themes/clavesol_dark.css`, `clavesol_light.css`: variáveis nativas dos temas.
- `css/themes/clavesol_ui.css`: ajustes de tipografia/bordas/foco restritos aos temas Clave Sol.
- `css/themes/clavesol_fonts.css`: três fontes incorporadas (DM Sans 400/600 e Playfair Display 500), obtidas da API oficial Google Fonts; não requer loader ou dependência adicional.
- `css/themes/font-licenses/`: licenças OFL de ambas as famílias.
- `css/themes/themes.css`, `css/style.css`: imports.
- `js/themes/theme_list.ts`: registro dos dois temas e padrão claro.

Documentação: README.md, UPSTREAM.md e este arquivo. Package-lock.json e dependências inalterados.

## Validação

- `npm run build`: passou, incluindo `test:types` oficial (ESLint e TypeScript); não repetido desnecessariamente.
- Navegador integrado: MIDI oficial carregado, tempo avançando e vozes ativas em ambos os temas; animação, ondas e teclado observados; pausa/retomada por espaço.
- Configurações e troca claro/escuro verificadas. Mixer aberto e instrumento do canal 1 alterado para Telephone 2, confirmado na visualização.
- Inspeção responsiva em 390 × 844 e viewport padrão: controles, teclado e canvas presentes. Os nomes de instrumentos no canvas original podem se sobrepor em telas estreitas; o comportamento do renderer foi preservado.
- Nenhum erro de console observado. Não foram repetidos exports longos nem aguardado o fim da música.
- Audição física do áudio e hardware MIDI não verificáveis por este teste; não se afirma escuta pelos alto-falantes.

## Executar

```bash
cd /home/djames/Documents/ClaveSol/SITE/clavesol-midi
npm start
```

Abra http://localhost:8181 e escolha o tema em Settings → Theme. Após editar, `npm run build`, reinicie e recarregue. Para testes estáticos isolados, `npm test`.

Nenhum catálogo, coleção pessoal, publicação ou alteração no repositório Clave Sol. Etapa 2 encerrada.
