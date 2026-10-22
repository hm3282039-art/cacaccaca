/* Permet à Node d'importer des fichiers .css (stubbés) pour tester main.js. */
import { pathToFileURL } from 'node:url';

const STUB = new URL('./css-stub.mjs', import.meta.url).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier.endsWith('.css')) {
    return { url: STUB, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
