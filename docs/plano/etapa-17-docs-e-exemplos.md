# Etapa 17 — Documentação e exemplos

Leia antes: `00-LEIA-PRIMEIRO.md` (inteiro, inclusive a tabela "Andamento"), `CONTRATO-TABLETOP.md`, `README.md`, `progress.md`.

## Objetivo

Deixar o Ateliê fácil de usar sem ninguém explicar, e fácil de manter: um guia de uso, um guia de manutenção do acervo, três documentos de exemplo que funcionam sem o acervo pago, e uma ajuda rápida dentro do próprio app.

## Documentos de exemplo (`examples/`)

Três documentos feitos **só com efeitos procedurais (etapa 15), formas e fontes do sistema**, versionados no git (não usam nada do acervo):

1. **Carta envelhecida**: A4, papel creme, texto à máquina com desgaste 60 %, manchas de café, uma dobra horizontal, assinatura à mão. Campos: "Destinatário", "Corpo da carta", "Assinatura".
2. **Recorte de jornal**: 1200 × 700, manchete, linha fina e corpo em duas colunas (duas caixas de texto), borda rasgada embaixo, grão. Campos: "Manchete", "Linha fina", "Texto".
3. **Relatório com UV**: A4, formulário simples (formas e texto limpo), uma frase "ELE AINDA ESTÁ AQUI" em camada `uv`. Campos: "Nome", "Data", "Mensagem UV".

Desenhe cada um no próprio editor até ficar bonito (compare com as prévias do acervo em `Documentos/Bundle 2`, `Bundle 4` e `Bundle 59`), salve, e copie o JSON para `examples/<nome>.json`. O servidor os oferece como modelos quando a biblioteca não tiver modelos: em `GET /api/atelie/library`, se `available` for falso ou não houver `template`, acrescente os exemplos como itens `kind: 'template'` com `category: 'Exemplos'` (a prévia gerada na primeira execução e guardada em `<dataDir>/examples-previews/`).

## Ajuda no app

- Botão **?** no cabeçalho abre um painel lateral com: os atalhos (tabela), "Como começar" (3 passos: abrir um modelo, preencher, salvar), "Camadas e mesclagem" (uma frase por modo útil para papel: multiplicação para manchas e texto sobre papel, sobrepor e luz suave para amassados, divisão de tela para luz) e "Usar no Tabletop" (o que a etapa 18 permite).
- Na primeira visita (`localStorage`, `atelie-visited`), o painel abre sozinho uma vez.

## Documentação

1. `docs/USO.md`: o que é, começar por um modelo, Preencher, camadas (tipos, ordem, mesclagem, recorte, opacidade, travar), texto e tintas, imagens enviadas, biblioteca, efeitos, luz UV, salvar e o endereço `?handout=`, exportar e imprimir, atalhos, limites conhecidos.
2. `docs/MANUTENCAO.md`: como importar e reimportar o acervo (comandos das etapas 8 e 12, com os tempos e tamanhos medidos registrados no `progress.md`), onde fica cada arquivo, como ler os relatórios (`reports/`), o que fazer com um modelo marcado `revisar`, como acrescentar uma fonte, e o aviso de que o acervo é privado.
3. `README.md`: link para os dois.
4. `CONTRATO-TABLETOP.md`: no fim, a lista "qual teste cobre qual linha" (se a etapa 13 não deixou pronta).

## Testes

- `tests/examples.test.js`: cada `examples/*.json` passa em `validateHandout`, não usa `src.library` nem fontes da biblioteca, e tem campos.
- `tests/library-server.test.js` (acrescente): sem `library.json`, a listagem traz os 3 exemplos como modelos.
- `tests/e2e/editor.test.js` (acrescente): na primeira visita o painel de ajuda abre; abrir o exemplo "Carta envelhecida" e mudar o campo "Assinatura" muda o canvas.

## Pronto quando

- [ ] Testes passam; `npm test` e os E2E passam.
- [ ] A tabela "Andamento" de `00-LEIA-PRIMEIRO.md` está completa até a 17.
