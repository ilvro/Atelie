# Ateliê de documentos

O Ateliê de documentos é um aplicativo dedicado à criação, edição e visualização de documentos imersivos de RPG (*handouts*), como cartas antigas, jornais de época, fichas de investigação, telegramas e fotos polaroides. Ele funciona como uma bancada de artesão digital, permitindo manipular papéis envelhecidos, manchas, carimbos, dobras, fontes de máquina de escrever e camadas secretas que só aparecem sob luz ultravioleta (UV), com leitura em tela cheia e integração direta com o Tabletop.

Para começar no ambiente de desenvolvimento, execute `npm install` e em seguida `npm run dev`. O servidor backend sobe em `http://127.0.0.1:3011` (`ATELIE_PORT`) e a interface Vite abre em `http://127.0.0.1:5174` (`ATELIE_UI_PORT`). O app pode ser construído como site estático com `npm run build` para publicação no GitHub Pages, onde roda de forma autônoma salvando os documentos no navegador do usuário (IndexedDB).

Os documentos e envios do usuário ficam armazenados na pasta `data/` (ou no IndexedDB do navegador). A coleção da casa, localizada em `public/colecao/`, acompanha o aplicativo no Git e traz dezenas de papéis, texturas procedurais, elementos vetoriais, fontes livres e modelos prontos. Expansões opcionais e privadas (como o acervo *Arquivos Confidenciais*) ficam isoladas em `data-private/expansoes/` fora do controle de versão; o aplicativo é 100% completo, funcional e rico mesmo sem nenhuma expansão instalada.

