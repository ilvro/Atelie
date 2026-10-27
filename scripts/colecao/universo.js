/**
 * O universo da coleção da casa: instituições fictícias próprias, o elenco que se repete entre os
 * documentos, lugares e épocas. Os modelos tiram daqui os nomes, endereços e pessoas, para conversarem
 * entre si, e a auditoria (audit.js) confere as fontes pela época.
 *
 * Nada aqui vem de propriedade intelectual alheia nem do acervo privado (Arquivos Confidenciais).
 */

export const ERAS = ['medieval', '1890', '1920', '1950', '1980', 'hoje'];
export const TONS = ['investigação', 'horror', 'fantasia', 'cotidiano', 'sci-fi'];

/** Retratos de estúdio da coleção (Fase C0) que dão rosto fixo ao elenco. */
export const RETRATOS = {
  homem: ['casa-foto-retrato-homem-bigode-oculos', 'casa-foto-retrato-rapaz-cdv', 'casa-foto-retrato-jovem-hussardo', 'casa-foto-retrato-oficial-sabre'],
  mulher: ['casa-foto-retrato-mulher-sanfona'],
  idoso: ['casa-foto-retrato-senhora-capa'],
};

const pessoa = (nome, cargo, retrato, extra = {}) => ({ nome, cargo, retrato, ...extra });

export const INSTITUICOES = {
  delegacia: {
    id: 'delegacia', nome: 'Delegacia de Investigações Especiais', sigla: 'DIE',
    endereco: 'Rua da Praça Velha, 120 — Centro', cidade: 'São Paulo',
    epocas: ['1920', '1950', '1980'], tom: 'investigação',
    fontes: ['Courier Prime', 'Special Elite'], paleta: { papel: '#e4dcc4', tinta: '#1d1b24', selo: '#7a1f1f' },
    elenco: [
      pessoa('Delegado Antônio Salgueiro', 'Delegado titular', RETRATOS.homem[0]),
      pessoa('Inspetor Heitor Barroso', 'Inspetor', RETRATOS.homem[3]),
      pessoa('Escrivã Marta Quintanilha', 'Escrivã', RETRATOS.mulher[0]),
      pessoa('Investigador Cássio Prado', 'Investigador', RETRATOS.homem[1]),
      pessoa('Perito Gaspar Lemos', 'Perito criminal', RETRATOS.homem[2]),
    ],
  },
  sanatorio: {
    id: 'sanatorio', nome: 'Sanatório da Serra do Mar', sigla: 'SSM',
    endereco: 'Estrada do Alto da Serra, km 9', cidade: 'Cubatão',
    epocas: ['1920', '1950'], tom: 'horror',
    fontes: ['Courier Prime', 'Homemade Apple'], paleta: { papel: '#e8e0cc', tinta: '#26303a', selo: '#8a2b2b' },
    elenco: [
      pessoa('Dr. Augusto Vasconcelos', 'Diretor clínico', RETRATOS.homem[0]),
      pessoa('Dra. Helena Albuquerque', 'Médica-chefe', RETRATOS.mulher[0]),
      pessoa('Irmã Benedita', 'Enfermeira-chefe', RETRATOS.idoso[0]),
      pessoa('Sr. Tobias Figueira', 'Zelador', RETRATOS.homem[1]),
    ],
  },
  gazeta: {
    id: 'gazeta', nome: 'A Gazeta Metropolitana', sigla: 'GM',
    endereco: 'Rua do Comércio, 45', cidade: 'São Paulo',
    epocas: ['1890', '1920', '1950'], tom: 'cotidiano',
    fontes: ['Old Standard TT', 'Playfair Display', 'Libre Baskerville'], paleta: { papel: '#e6dcc0', tinta: '#1b1a17', selo: '#222222' },
    elenco: [
      pessoa('Aurélio Mendes Filho', 'Redator-chefe', RETRATOS.homem[0]),
      pessoa('Lúcia Camargo', 'Repórter policial', RETRATOS.mulher[0]),
      pessoa('Otávio Ribeiro', 'Fotógrafo', RETRATOS.homem[1]),
      pessoa('Zeferino Abreu', 'Tipógrafo', RETRATOS.homem[3]),
    ],
  },
  solar: {
    id: 'solar', nome: 'Solar dos Pinhais', sigla: 'SP',
    endereco: 'Estrada Velha de Petrópolis, km 12', cidade: 'Petrópolis',
    epocas: ['1890', '1920'], tom: 'horror',
    fontes: ['IM Fell English', 'Cormorant Garamond'], paleta: { papel: '#efe6d2', tinta: '#2a1f14', selo: '#5b3a1e' },
    elenco: [
      pessoa('Barão Egídio de Almeida Pinhais', 'Proprietário', RETRATOS.homem[3]),
      pessoa('Baronesa Eulália', 'Senhora da casa', RETRATOS.idoso[0]),
      pessoa('Arthur H. Mendonça', 'Procurador da família', RETRATOS.homem[0]),
      pessoa('Mariana Pinhais', 'Sobrinha', RETRATOS.mulher[0]),
    ],
  },
  companhia: {
    id: 'companhia', nome: 'Companhia Marítima e Comercial do Atlântico', sigla: 'CMCA',
    endereco: 'Cais do Porto, armazém 7', cidade: 'Santos',
    epocas: ['1890', '1920'], tom: 'cotidiano',
    fontes: ['Special Elite', 'Libre Baskerville'], paleta: { papel: '#e2d8bd', tinta: '#14233a', selo: '#1f3a5f' },
    elenco: [
      pessoa('Comandante Álvaro Tavares', 'Comandante do vapor Estrela do Sul', RETRATOS.homem[3]),
      pessoa('Sr. Nuno Esteves', 'Agente de cargas', RETRATOS.homem[0]),
      pessoa('Clotilde Reis', 'Escriturária', RETRATOS.mulher[0]),
      pessoa('Capitão Ramiro Duarte', 'Capitão do porto', RETRATOS.homem[2]),
    ],
  },
  iml: {
    id: 'iml', nome: 'Instituto Médico Legal do Estado', sigla: 'IML',
    endereco: 'Rua Teodoro Sampaio, 220', cidade: 'São Paulo',
    epocas: ['1920', '1950', '1980'], tom: 'investigação',
    fontes: ['Courier Prime', 'Share Tech Mono'], paleta: { papel: '#e9e5da', tinta: '#1d2a2a', selo: '#355a5a' },
    elenco: [
      pessoa('Dr. Raimundo Teles', 'Médico legista', RETRATOS.homem[0]),
      pessoa('Dra. Ofélia Matos', 'Perita legista', RETRATOS.mulher[0]),
      pessoa('Sr. Cândido Lopes', 'Auxiliar de necropsia', RETRATOS.homem[1]),
      pessoa('Dr. Valério Nunes', 'Diretor do instituto', RETRATOS.homem[2]),
    ],
  },
  doe: {
    id: 'doe', nome: 'Departamento de Ocorrências Extraordinárias', sigla: 'DOE',
    endereco: 'Esplanada dos Ministérios, bloco R, sala 413', cidade: 'Brasília',
    epocas: ['1950', '1980', 'hoje'], tom: 'investigação',
    fontes: ['Courier Prime', 'Share Tech Mono', 'Special Elite'], paleta: { papel: '#e6e2d6', tinta: '#161a22', selo: '#2b3f66' },
    elenco: [
      pessoa('Diretor Hélio Andrade Costa', 'Diretor-geral', RETRATOS.homem[0]),
      pessoa('Agente Letícia Borges', 'Agente de campo', RETRATOS.mulher[0]),
      pessoa('Agente Nelson Tavares', 'Agente de campo', RETRATOS.homem[2]),
      pessoa('Analista Wanda Prado', 'Analista de arquivo', RETRATOS.idoso[0]),
      pessoa('Coronel Reinaldo Siqueira', 'Ligação militar', RETRATOS.homem[3]),
    ],
  },
  halden: {
    id: 'halden', nome: 'Instituto Halden de Biologia Experimental', sigla: 'IHBE',
    endereco: 'Estrada do Pico Alto, s/n', cidade: 'Teresópolis',
    epocas: ['1950', '1980'], tom: 'sci-fi',
    fontes: ['Share Tech Mono', 'Courier Prime'], paleta: { papel: '#e8ece6', tinta: '#12261f', selo: '#2e6b4f' },
    elenco: [
      pessoa('Prof. Ernst Halden', 'Fundador e diretor', RETRATOS.homem[0]),
      pessoa('Dra. Inês Vasconcellos', 'Pesquisadora sênior', RETRATOS.mulher[0]),
      pessoa('Dr. Matias Ferraz', 'Bioquímico', RETRATOS.homem[1]),
      pessoa('Sr. Olavo Brandão', 'Chefe de segurança', RETRATOS.homem[3]),
    ],
  },
  irmandade: {
    id: 'irmandade', nome: 'Irmandade da Lua Tríplice', sigla: 'ILT',
    endereco: 'Casa do Vale, sem número', cidade: 'Vila Aurora',
    epocas: ['medieval', '1890', '1920', '1980'], tom: 'horror',
    fontes: ['Pirata One', 'IM Fell English', 'Cormorant Garamond'], paleta: { papel: '#e2d6b8', tinta: '#2a1018', selo: '#6b1b2e' },
    elenco: [
      pessoa('Mestre Aurélio Vigário', 'Mestre da irmandade', RETRATOS.idoso[0]),
      pessoa('Irmã Cecília das Águas', 'Guardiã do livro', RETRATOS.mulher[0]),
      pessoa('Irmão Teodoro', 'Escriba', RETRATOS.homem[1]),
      pessoa('Irmão Lázaro', 'Porteiro', RETRATOS.homem[3]),
    ],
  },
  colegio: {
    id: 'colegio', nome: 'Colégio Estadual Visconde de Mauá', sigla: 'CEVM',
    endereco: 'Avenida das Acácias, 300', cidade: 'Vila Aurora',
    epocas: ['1920', '1950', '1980'], tom: 'cotidiano',
    fontes: ['Libre Baskerville', 'Caveat', 'Courier Prime'], paleta: { papel: '#efe9d8', tinta: '#1a2a4a', selo: '#1f3a6b' },
    elenco: [
      pessoa('Diretora Judite Moraes', 'Diretora', RETRATOS.mulher[0]),
      pessoa('Prof. Anselmo Pires', 'Professor de História', RETRATOS.homem[0]),
      pessoa('Prof.ª Marlene Cavalcanti', 'Professora de Ciências', RETRATOS.idoso[0]),
      pessoa('Sr. Josué Barbosa', 'Inspetor de alunos', RETRATOS.homem[1]),
    ],
  },
  cartorio: {
    id: 'cartorio', nome: 'Cartório do 2º Ofício de Notas de Vila Aurora', sigla: '2º Ofício',
    endereco: 'Rua da Matriz, 18', cidade: 'Vila Aurora',
    epocas: ['1890', '1920', '1950', '1980'], tom: 'cotidiano',
    fontes: ['Special Elite', 'Libre Baskerville', 'Old Standard TT'], paleta: { papel: '#e8dfc6', tinta: '#201a14', selo: '#5a2a2a' },
    elenco: [
      pessoa('Tabelião Bonifácio Leão', 'Tabelião', RETRATOS.homem[0]),
      pessoa('Escrevente Adelaide Souto', 'Escrevente', RETRATOS.mulher[0]),
      pessoa('Oficial Pascoal Ferraz', 'Oficial de registro', RETRATOS.homem[1]),
      pessoa('Escrevente Moacir Dutra', 'Escrevente', RETRATOS.homem[3]),
    ],
  },
  radio: {
    id: 'radio', nome: 'Rádio e Televisão Atalaia', sigla: 'RTA',
    endereco: 'Avenida da Torre, 1000', cidade: 'Vila Aurora',
    epocas: ['1950', '1980'], tom: 'cotidiano',
    fontes: ['Bebas Neue', 'Courier Prime', 'Special Elite'], paleta: { papel: '#ece4cf', tinta: '#2a1a12', selo: '#9a3a1a' },
    elenco: [
      pessoa('Locutor Murilo Campos', 'Locutor', RETRATOS.homem[0]),
      pessoa('Radioatriz Iolanda Prado', 'Radioatriz', RETRATOS.mulher[0]),
      pessoa('Diretor Edmundo Salles', 'Diretor artístico', RETRATOS.homem[3]),
      pessoa('Técnico Valdir Rocha', 'Técnico de som', RETRATOS.homem[1]),
    ],
  },
  banco: {
    id: 'banco', nome: 'Banco Comercial do Planalto', sigla: 'BCP',
    endereco: 'Praça da Bolsa, 7', cidade: 'São Paulo',
    epocas: ['1920', '1950', '1980'], tom: 'cotidiano',
    fontes: ['Playfair Display', 'Libre Baskerville', 'Courier Prime'], paleta: { papel: '#e8e2cf', tinta: '#10281c', selo: '#1d4a32' },
    elenco: [
      pessoa('Presidente Otacílio Ventura', 'Presidente do banco', RETRATOS.homem[0]),
      pessoa('Gerente Fabrício Neves', 'Gerente geral', RETRATOS.homem[2]),
      pessoa('Caixa Rosalina Arantes', 'Caixa-chefe', RETRATOS.mulher[0]),
      pessoa('Contador Epaminondas Reis', 'Contador', RETRATOS.idoso[0]),
    ],
  },
};

/** Lugares recorrentes, por época em que existem. */
export const LUGARES = [
  { nome: 'Vila Aurora', tipo: 'cidade do interior', epocas: ['1890', '1920', '1950', '1980', 'hoje'] },
  { nome: 'Paranapiacaba', tipo: 'vila ferroviária', epocas: ['1890', '1920', '1950'] },
  { nome: 'Serra do Mar', tipo: 'serra', epocas: ['medieval', '1890', '1920', '1950', '1980', 'hoje'] },
  { nome: 'Porto de Santos', tipo: 'porto', epocas: ['1890', '1920', '1950', '1980'] },
  { nome: 'Vale do Tietê', tipo: 'vale', epocas: ['1890', '1920', '1950', '1980', 'hoje'] },
  { nome: 'Ilhas Sombrias', tipo: 'arquipélago', epocas: ['medieval', '1890', '1920'] },
];

/** Em que épocas cada fonte da coleção soa correta (a auditoria avisa, não falha). */
export const FONT_ERAS = {
  'Courier Prime': ['1950', '1980', 'hoje', '1920'],
  'Special Elite': ['1920', '1950', '1980'],
  'IM Fell English': ['medieval', '1890', '1920'],
  'Libre Baskerville': ['1890', '1920', '1950', '1980', 'hoje'],
  'Old Standard TT': ['1890', '1920', '1950'],
  'Playfair Display': ['1890', '1920', '1950', '1980', 'hoje'],
  'Cormorant Garamond': ['medieval', '1890', '1920', '1950', '1980', 'hoje'],
  'Caveat': ['1950', '1980', 'hoje'],
  'Homemade Apple': ['1890', '1920', '1950', '1980', 'hoje'],
  'Nothing You Could Do': ['1950', '1980', 'hoje'],
  'Bebas Neue': ['1950', '1980', 'hoje'],
  'Pirata One': ['medieval', '1890', '1920'],
  'Share Tech Mono': ['1980', 'hoje'],
  'VT323': ['1980', 'hoje'],
  'UnifrakturMaguntia': ['medieval', '1890', '1920', '1950'],
  'Anton': ['1950', '1980', 'hoje'],
  'Black Ops One': ['1980', 'hoje'],
  'Cutive Mono': ['1950', '1980', 'hoje'],
  'Dawning of a New Day': ['1950', '1980', 'hoje'],
  'IM Fell DW Pica': ['medieval', '1890', '1920'],
  'Kalam': ['1980', 'hoje'],
  'Oswald': ['1950', '1980', 'hoje'],
  'Permanent Marker': ['1980', 'hoje'],
  'Reenie Beanie': ['1980', 'hoje'],
  'Rock Salt': ['1980', 'hoje'],
  'Stardos Stencil': ['1950', '1980'],
  'Shadows Into Light': ['1980', 'hoje'],
  'Indie Flower': ['1980', 'hoje'],
  'Gloria Hallelujah': ['1980', 'hoje'],
  'La Belle Aurore': ['1890', '1920', '1950', '1980', 'hoje'],
  'Mrs Saint Delafield': ['1890', '1920', '1950'],
  'Pinyon Script': ['1890', '1920', '1950'],
  'Great Vibes': ['1890', '1920', '1950', '1980'],
  'EB Garamond': ['medieval', '1890', '1920', '1950', '1980', 'hoje'],
  'Cinzel': ['medieval', '1890', '1920', '1950', '1980', 'hoje'],
  'Uncial Antiqua': ['medieval'],
  'Grenze Gotisch': ['medieval', '1890'],
  'Rye': ['1890', '1920'],
  'Inter': ['hoje'],
  'Libre Barcode 39 Text': ['1980', 'hoje'],
};

export function fontFitsEra(family, era) {
  const eras = FONT_ERAS[family];
  return !eras || !era || eras.includes(era);
}

/** Uma pessoa do elenco, escolhida de forma estável pela semente (a mesma semente, a mesma pessoa). */
export function pessoaDe(orgId, seed = 0) {
  const org = INSTITUICOES[orgId];
  if (!org) throw new Error(`Instituição desconhecida: ${orgId}`);
  return org.elenco[Math.abs(Math.floor(seed)) % org.elenco.length];
}

/** Nomes que nunca podem aparecer nos modelos da casa: são do acervo privado ou de terceiros. */
export const NOMES_PROIBIDOS = ['Ordo', 'C.R.I.S.', 'Praga Carmesim', 'Arquivos Confidenciais'];
