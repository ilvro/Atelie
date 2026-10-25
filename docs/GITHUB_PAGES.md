# Ateliê de Documentos no GitHub Pages

O Ateliê pode ser publicado como site estático no GitHub Pages sob `https://<usuário>.github.io/<repositório>/` (por exemplo, `https://<usuário>.github.io/Atelie/`), funcionando sem nenhum servidor Node e integrando-se diretamente ao Tabletop publicado na mesma conta pelo Caminho A do contrato (`mesa-handouts-v1` e `BroadcastChannel`).

---

## Como Publicar com GitHub Actions

1. Envie o código com o workflow `.github/workflows/pages.yml` para a branch principal (`main` ou `master`).
2. No repositório do GitHub, abra **Settings → Pages**.
3. Em **Build and deployment → Source**, selecione **GitHub Actions**.
4. Em **Actions**, o workflow **Publicar Ateliê no GitHub Pages** será acionado automaticamente a cada push na branch principal (ou manualmente via *Run workflow*).
5. O workflow executa `npm ci`, roda todos os testes unitários (`npm test`), compila o site estático com `npm run build:pages` e publica **estritamente o diretório `dist-pages/`**.
6. Acesse a URL gerada pelo GitHub Pages (ex.: `https://<usuário>.github.io/Atelie/`). O nome do repositório e os caminhos não são fixos no código — toda a navegação e carregamento de assets usam caminhos relativos (`./`).

---

## Conferir o Build Localmente

Para simular o ambiente estático do GitHub Pages na sua máquina:

```bash
npm ci
npm run build:pages
npm run preview:pages
```

Abra a URL informada pelo Vite (`http://127.0.0.1:4173` ou similar). O diretório `dist-pages/` também pode ser hospedado em qualquer servidor HTTP estático (Nginx, Caddy, Apache, Vercel, Netlify).

Para executar com o servidor local Express tradicional (com gravação em disco em `data/`):

```bash
npm run build
npm start
```

---

## Onde Ficam os Dados

Em modo GitHub Pages (`browser`), o Ateliê opera de forma totalmente autônoma no navegador:

- **Armazenamento no Navegador**: Documentos, pastas, uploads e versões são gravados no IndexedDB local (`atelie-v1:<origem>/<caminho>`).
- **Persistência**: Ao arquivar o primeiro documento, o Ateliê solicita persistência (`navigator.storage.persist()`), evitando que o navegador limpe o armazenamento por falta de espaço.
- **Isolamento por Origem e Subcaminho**: Cada instalação mantém sua própria biblioteca e rascunhos isolados.
- **Espaço Usado**: Em **Ajustes** (ícone de engrenagem na barra de ferramentas), é exibido o espaço em megabytes utilizado no navegador.

---

## Cópia de Segurança (Backup e Restauração)

Como os dados residem localmente no navegador, recomenda-se realizar cópias de segurança periódicas:

1. Abra **Ajustes** (atalho `,` ou clique no botão na barra lateral).
2. Na seção **Armazenamento e cópia de segurança**:
   - **Exportar tudo**: gera e baixa um arquivo `atelie-backup-<data>.json` contendo todos os documentos, pastas e imagens enviadas (em base64).
   - **Importar**: permite selecionar um arquivo de backup `.json` anterior.
3. **Regra de Mesclagem Segura**:
   - A importação **não apaga** nenhum documento ou pasta existente.
   - Documentos locais com o mesmo ID e **revisão maior** são preservados; versões mais antigas do backup são ignoradas.
   - Imagens enviadas são restauradas sem duplicar identificadores existentes.

---

## Integração com o Tabletop Publicado

Quando o Tabletop e o Ateliê estão publicados sob a mesma conta do GitHub Pages (ex.: `https://<usuário>.github.io/Tabletop/` e `https://<usuário>.github.io/Atelie/`):

- **Mesma Origem (`https://<usuário>.github.io`)**: Como compartilham a mesma origem web, ambos têm acesso ao mesmo banco IndexedDB `mesa-handouts-v1`.
- **Caminho A (Automático)**:
  - Ao arquivar um documento no Ateliê, o resumo e o assado gráfico (`image/png` normal e UV) são gravados em `mesa-handouts-v1`.
  - Uma mensagem `handout-saved` é emitida pelo `BroadcastChannel('mesa:handout')`.
  - O Tabletop aberto na mesma sessão recebe a notificação em tempo real e exibe o documento na bandeja "Do ateliê…".
- **Localização do Irmão**: O Tabletop publicado localiza o Ateliê pelo caminho irmão relativo `../Atelie/`.

---

## O Que NÃO Vai para o Site (Expansões e Privacidade)

- **Coleção da Casa**: Todos os papéis, texturas, vetores, fontes livres e modelos da casa (`public/colecao/`) são incluídos no build estático (`dist-pages/colecao/`).
- **Expansões Privadas**: Pastas privadas (`data-private/` e `data-private/expansoes/`), como pacotes com licenças proprietárias ou do acervo do usuário, **nunca** entram no build público nem são enviadas para o git. O teste automatizado `tests/pages-build.test.js` garante que nenhum arquivo privado ou identificador de expansão (`ac-`) esteja presente em `dist-pages/`.

