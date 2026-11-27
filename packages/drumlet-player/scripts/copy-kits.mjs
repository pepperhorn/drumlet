import { cpSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pkgRoot = resolve(import.meta.dirname, '..');
const { name, version } = JSON.parse(readFileSync(resolve(pkgRoot, 'package.json'), 'utf8'));

export const kitBaseUrl = `https://cdn.jsdelivr.net/npm/${name}@${version}/dist/kits/`;

if (process.argv[1] && resolve(process.argv[1]) === import.meta.filename) {
  cpSync(resolve(pkgRoot, '../../public/samples/acoustic1'), resolve(pkgRoot, 'dist/kits/acoustic1'), { recursive: true });
}
