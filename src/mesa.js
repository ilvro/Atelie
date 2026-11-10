// A ligação do Ateliê com a mesa (contrato v1, ver Atlas/docs/PLATAFORMA.md): atende `atelie.abrir { ref }` abrindo o documento
// e avisa `atelie.documento-salvo` quando um documento é arquivado. É só o barramento de eventos da mesa: o contrato com o
// Tabletop (banco `mesa-handouts-v1`, canal `mesa:handout`, janela e HTTP) continua como está, em `data/exchange.js`.
// Sem BroadcastChannel, ou sem a campanha ativa, nada muda: o Ateliê funciona como antes.
import { abrirRepositorioCampanha, criarBarramento, criarRef } from '../vendor/mesa-core/index.js';

const CHAVE_CAMPANHA_ATIVA = 'mesa:campanha-ativa';

export const refDoDocumento = id => criarRef('atelie', 'documento', String(id));

const campanhaAtiva = () => {
  try { return localStorage.getItem(CHAVE_CAMPANHA_ATIVA) || null; } catch { return null; }
};

/**
 * Liga o Ateliê à mesa. `atelie` entrega o que o aplicativo sabe fazer: `existe(id)` (o documento está aqui?) e `abrir(id)`.
 * Devolve `{ documentoSalvo, parar }`, seguros de chamar mesmo sem plataforma.
 */
export function iniciarMesa(atelie, ambiente = {}) {
  const semMesa = { documentoSalvo() {}, parar() {} };
  const BC = ambiente.BroadcastChannel ?? globalThis.BroadcastChannel;
  if (typeof BC === 'undefined') return semMesa;
  let barramento;
  try {
    barramento = criarBarramento({ app: 'atelie', campanhaId: campanhaAtiva(), ...(ambiente.criarCanal ? { criarCanal: ambiente.criarCanal } : {}) });
  } catch (erro) {
    console.warn('Ateliê: sem a plataforma da mesa', erro);
    return semMesa;
  }

  barramento.atender('atelie.abrir', async dados => {
    const ref = dados?.ref;
    if (ref?.app !== 'atelie' || ref.tipo !== 'documento') return { ok: false, motivo: 'O Ateliê só abre documentos seus.' };
    let achou = false;
    try { achou = await atelie.existe(ref.id); } catch { /* trata como ausente */ }
    if (!achou) return { ok: false, motivo: 'Este documento não existe neste Ateliê.' };
    await atelie.abrir(ref.id);
    try { globalThis.focus?.(); } catch { /* o navegador pode não deixar trazer a aba à frente */ }
    return { ok: true };
  });

  return {
    /** Avisa que o documento foi arquivado (nova revisão). Não depende de "Compartilhar com o Tabletop". */
    documentoSalvo(handout) {
      if (!handout?.id) return;
      barramento.campanhaId = campanhaAtiva();
      try { barramento.emitir('atelie.documento-salvo', { documento: refDoDocumento(handout.id), ...(Number.isInteger(handout.revision) ? { revisao: handout.revision } : {}) }); }
      catch (erro) { console.warn('Ateliê: documento salvo não avisado', erro); }
    },
    parar() { barramento.fechar(); },
  };
}

/**
 * Registra o documento como `pista` na campanha ativa da Mesa (usado pela ponte do assistente, só em desenvolvimento).
 * Sem duplicar: se a ref já tem entidade e ela é do Ateliê, só atualiza o nome. Sem campanha ativa não faz nada.
 * `ambiente` (testes): `campanhaId`, `abrir` (padrão: `abrirRepositorioCampanha({ app: 'atelie' })`).
 * Devolve `{ registrada: boolean, motivo?: string, entidadeId?: string }`.
 */
export async function registrarPista(handout, ambiente = {}) {
  if (!handout?.id) return { registrada: false, motivo: 'documento sem id' };
  const campanhaId = ambiente.campanhaId === undefined ? campanhaAtiva() : ambiente.campanhaId;
  if (!campanhaId) return { registrada: false, motivo: 'sem campanha ativa na Mesa' };
  const abrir = ambiente.abrir ?? (() => abrirRepositorioCampanha({ app: 'atelie' }));
  const ref = refDoDocumento(handout.id);
  const repo = await abrir();
  try {
    const existente = await repo.entidadeDaRef(campanhaId, ref);
    if (existente) {
      if (existente.criadaPor === 'atelie' && existente.nome !== handout.name) await repo.salvarEntidade({ ...existente, nome: handout.name });
      return { registrada: true, entidadeId: existente.id };
    }
    const nova = await repo.criarEntidade({ campanhaId, tipo: 'pista', nome: handout.name || 'Documento', refs: [ref] });
    return { registrada: true, entidadeId: nova.id };
  } finally {
    try { repo.fechar?.(); } catch { /* ignora */ }
  }
}
