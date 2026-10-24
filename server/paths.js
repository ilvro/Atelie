import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
/** The person's documents and uploads. */
export const defaultDataDir = (env = process.env) => path.resolve(env.ATELIE_DATA_DIR || path.join(projectDir, 'data'));
/** The house collection: papers, elements, fonts and templates of the Ateliê itself, tracked and published with the app. */
export const collectionDir = path.join(projectDir, 'public', 'colecao');
/** Expansions (private libraries such as the Arquivos Confidenciais): never tracked, never public. One folder per expansion. */
export const defaultExpansionsDir = (env = process.env) => path.resolve(env.ATELIE_EXPANSIONS_DIR || path.join(projectDir, 'data-private', 'expansoes'));
export const expansionDir = (id, env = process.env) => path.join(defaultExpansionsDir(env), id);
/** Origins allowed to read documents across origins (the Tabletop). */
export const defaultAllowedOrigins = (env = process.env) => (env.ATELIE_ALLOWED_ORIGINS || 'http://127.0.0.1:3001,http://localhost:3001,http://127.0.0.1:5173,http://localhost:5173').split(',').map(origin => origin.trim()).filter(Boolean);

