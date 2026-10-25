#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const libraryJsonPath = path.join(projectRoot, 'public/colecao/library.json');
const outputDocPath = path.join(projectRoot, 'docs/LICENCAS.md');

/**
 * Gera o texto canônico de docs/LICENCAS.md a partir dos manifestos do repositório.
 * @returns {string}
 */
export function generateLicensesDoc() {
  const libRaw = fs.readFileSync(libraryJsonPath, 'utf8');
  const library = JSON.parse(libRaw);

  const fontItems = library.items.filter(i => i.kind === 'font');
  const familiesMap = new Map();

  for (const item of fontItems) {
    if (!familiesMap.has(item.family)) {
      familiesMap.set(item.family, {
        family: item.family,
        category: item.category || 'Geral',
        license: item.license || 'OFL-1.1',
        file: item.file,
      });
    }
  }

  // Ordenar alfabeticamente para geração estável e determinística
  const sortedFamilies = Array.from(familiesMap.values()).sort((a, b) =>
    a.family.localeCompare(b.family, 'pt-BR')
  );

  const elementCount = library.items.filter(i => i.kind === 'element').length;
  const templateCount = library.items.filter(i => i.kind === 'template').length;

  return `# Licenças e Créditos de Distribuição — Ateliê de Documentos

Este documento relaciona as licenças de todo o material distribuído com o aplicativo **Ateliê de documentos**, incluindo código-fonte, fontes de interface, fontes tipográficas da coleção da casa e acervo de ativos (papéis, texturas, elementos vetoriais e modelos).

---

## 1. Código-fonte do Ateliê

O código-fonte do aplicativo Ateliê de Documentos é disponibilizado sob a **Licença MIT**.

\`\`\`text
MIT License

Copyright (c) 2026 Ateliê de Documentos

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
\`\`\`

---

## 2. Fontes da Interface do Aplicativo

As fontes tipográficas incorporadas na casca e na interface visual do Ateliê estão localizadas em \`src/ui/fonts/\` e são licenciadas sob termos livres e permissivos:

| Família | Uso | Licença | Origem |
|---|---|---|---|
| **Hanken Grotesk** | Tipografia principal da interface (menus, controles, trilho e textos informativos) | SIL Open Font License 1.1 | [Google Fonts / Hanken Design Co.](https://fonts.google.com/specimen/Hanken+Grotesk) |
| **IM Fell English** | Títulos táteis em fita crepe (\`.at-tape\`) e cabeçalhos editoriais | SIL Open Font License 1.1 | [Google Fonts / Igino Marini](https://fonts.google.com/specimen/IM+Fell+English) |
| **Courier Prime** | Carimbos de máquina, códigos e indicadores monospace | SIL Open Font License 1.1 | [Google Fonts / Quote-Unquote Apps](https://fonts.google.com/specimen/Courier+Prime) |

---

## 3. Fontes da Coleção da Casa

A coleção da casa disponibiliza **${sortedFamilies.length} famílias de fontes tipográficas livres**, auto-hospedadas e catalogadas em \`public/colecao/fontes/\`. Todas as famílias são provenientes do repositório oficial [google/fonts](https://github.com/google/fonts) no commit \`e7db6ca603fd4862010383ff17ffd6cc4ffac1c0\`, acompanhadas de seus respectivos arquivos de licença (\`OFL.txt\` ou \`LICENSE.txt\`) na pasta correspondente.

| Família | Categoria | Licença | Arquivo / Repositório Oficial |
|---|---|---|---|
${sortedFamilies.map(f => `| **${f.family}** | ${f.category} | ${f.license} | [\`${f.file}\`](https://github.com/google/fonts/tree/e7db6ca603fd4862010383ff17ffd6cc4ffac1c0/${f.license === 'Apache-2.0' ? 'apache' : 'ofl'}/${f.family.toLowerCase().replace(/[^a-z0-9]/g, '')}) |`).join('\n')}

---

## 4. Coleção da Casa (Papéis, Texturas, Elementos e Modelos)

O acervo artístico público do Ateliê distribuído em \`public/colecao/\` é composto por:

- **Papéis procedurais (48 arquivos WebP em 3 idades)**: gerados por algoritmos puros em código (\`src/domain/noise.js\` e \`scripts/colecao/papers.js\`).
- **Texturas de sobreposição (53 arquivos WebP com canal alfa)**: manchas de café, umidade, sangue oxidado, poeira, marcas queimadas, relevos de amassados, dobras e impressões digitais.
- **Elementos vetoriais (${elementCount} itens em SVG)**: carimbos burocráticos, marcas periciais, selos consulares, grampos, clipes, fitas adesivas transparentes e fita crepe.
- **Modelos de documentos (${templateCount} modelos estruturados em JSON)**: cartas de época, telegramas, certidões, boletins de ocorrência, fichas de investigação, recortes de jornal, polaroides e laudos.

### Licença dos Ativos da Coleção da Casa
Todos os itens deste acervo possuem o campo \`license: "própria"\` no manifesto \`library.json\` e são disponibilizados gratuitamente para uso irrestrito na criação, edição, exportação e impressão de documentos imersivos e materiais de campanhas de RPG.

> [!NOTE]
> **Expansões Privadas:** Pacotes adicionais de terceiros e expansões particulares (como o acervo *Arquivos Confidenciais*) devem ser instalados isoladamente na pasta \`data-private/expansoes/\`. Nenhum arquivo privado é incluído no controle de versão Git ou nos builds públicos estáticos.

---

## 5. Textos Integrais das Licenças de Terceiros

### SIL Open Font License 1.1 (OFL-1.1)

\`\`\`text
SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007

PREAMBLE
The goals of the Open Font License (OFL) are to stimulate worldwide development
of collaborative font projects, to support the font creation efforts of academic
and linguistic communities, and to provide a free and open framework in which
fonts may be shared and improved in partnership with others.

The OFL allows the licensed fonts to be used, studied, modified and
redistributed freely as long as they are not sold by themselves. The fonts,
including any derivative works, can be bundled, embedded, redistributed and/or
sold with any software provided that any reserved names are not used by
derivative works. The fonts and derivatives, however, cannot be released under
any other type of license. The requirement for fonts to remain under this
license does not apply to any document created using the fonts or their
derivatives.

PERMISSION & CONDITIONS
Permission is hereby granted, free of charge, to any person obtaining a copy
of the Font Software, to use, study, copy, merge, embed, modify, redistribute,
and sell modified and unmodified copies of the Font Software, subject to the
following conditions:

1) Neither the Font Software nor any of its individual components, in Source
or Binary forms, may be sold by itself.
2) Reserved Font Names: modified versions of the Font Software must be renamed.
3) The name(s) of Copyright Holder(s) or Author(s) of the Font Software shall
not be used to promote, endorse or advertise any Modified Version.
4) The Font Software must be distributed entirely under this license.

TERMINATION
This license becomes null and void if any of the above conditions are not met.

DISCLAIMER
THE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT OF COPYRIGHT, PATENT, TRADEMARK, OR
OTHER RIGHT.
\`\`\`

### Apache License, Version 2.0 (Apache-2.0)

\`\`\`text
                                 Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

1. Definitions.
"License" shall mean the terms and conditions for use, reproduction, and
distribution as defined by Sections 1 through 9 of this document.

"Licensor" shall mean the copyright owner or entity authorized by the copyright
owner that is granting the License.

2. Grant of Copyright License.
Subject to the terms and conditions of this License, each Contributor hereby
grants to You a perpetual, worldwide, non-exclusive, no-charge, royalty-free,
irrevocable copyright license to reproduce, prepare Derivative Works of,
publicly display, publicly perform, sublicense, and distribute the Work and
such Derivative Works in Source or Object form.

3. Grant of Patent License.
Subject to the terms and conditions of this License, each Contributor hereby
grants to You a perpetual, worldwide, non-exclusive, no-charge, royalty-free,
irrevocable patent license to make, have made, use, offer to sell, sell, import,
and otherwise transfer the Work.

4. Redistribution.
You may reproduce and distribute copies of the Work or Derivative Works thereof
in any medium, with or without modifications, and in Source or Object form,
provided that You meet the following conditions:
(a) You must give any other recipients of the Work a copy of this License; and
(b) You must cause any modified files to carry prominent notices stating that
    You changed the files; and
(c) You must retain, in the Source form of any Derivative Works that You
    distribute, all copyright, patent, trademark, and attribution notices.

7. Disclaimer of Warranty.
Unless required by applicable law or agreed to in writing, Licensor provides
the Work (and each Contributor provides its Contributions) on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND.
\`\`\`
`;
}

// Execução direta como script CLI
if (process.argv[1] && process.argv[1].endsWith('licenses.js')) {
  const content = generateLicensesDoc();
  fs.writeFileSync(outputDocPath, content, 'utf8');
  console.log(`[atelie] docs/LICENCAS.md gerado com sucesso (${content.length} caracteres).`);
}

