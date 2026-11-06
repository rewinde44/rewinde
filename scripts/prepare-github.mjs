import { copyFile, lstat, mkdir, readdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));

// Explicit source list: local workspaces, exports and repository history stay private.
export const sourceFiles = [
  '.dockerignore', '.editorconfig', '.gitattributes', '.gitignore', '.node-version',
  '.github/workflows/ci.yml',
  'CONTRIBUTING.md', 'Dockerfile', 'LICENSE', 'README.md', 'compose.yaml',
  'package.json', 'seed.mjs', 'server.mjs', 'start-local.cmd',
  'docs/github-veroeffentlichung.md', 'docs/hosting.md',
  'docs/product-roadmap.md', 'docs/verification.md',
  'public/_headers', 'public/app.js', 'public/datenschutz.html',
  'public/designer.css', 'public/domain.js', 'public/editor.js',
  'public/favicon.svg', 'public/index.html', 'public/logo.svg',
  'public/privacy.css', 'public/privacy.js', 'public/product.css',
  'public/project.js', 'public/reports.js', 'public/rewinde.css',
  'public/storage.js', 'public/styles.css', 'public/workspace.css',
  'scripts/build-privacy.mjs', 'scripts/build-static.mjs', 'scripts/prepare-github.mjs',
  'tests/designer.test.mjs', 'tests/domain.test.mjs', 'tests/editor.test.mjs',
  'tests/github.test.mjs', 'tests/preview-server.mjs', 'tests/server.test.mjs',
  'tests/storage.test.mjs'
];

async function existingFiles(directory, prefix = '') {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const name = prefix + entry.name;
    if (entry.isSymbolicLink()) throw new Error('Verknüpfung im Ausgabeordner: ' + name);
    if (entry.isDirectory()) {
      if (!sourceFiles.some(file => file.startsWith(name + '/'))) throw new Error('Zusätzliches Verzeichnis im Ausgabeordner: ' + name);
      result.push(...await existingFiles(join(directory, entry.name), name + '/'));
    }
    else result.push(name);
  }
  return result;
}

export async function prepareGithub(destination = join(projectRoot, 'outputs/github/rewinde'), root = projectRoot) {
  // Check every source and its parent directories before copying anything.
  const checked = new Set();
  for (const name of sourceFiles) {
    const segments = name.split('/');
    for (let i = 1; i <= segments.length; i++) {
      const part = join(root, ...segments.slice(0, i));
      if (checked.has(part)) continue;
      const info = await lstat(part);
      if (info.isSymbolicLink() || (i === segments.length ? !info.isFile() : !info.isDirectory())) {
        throw new Error('Keine reguläre Quelldatei oder Quellverzeichnis: ' + name);
      }
      checked.add(part);
    }
  }
  try {
    const target = await lstat(destination);
    if (!target.isDirectory() || target.isSymbolicLink()) throw new Error('Ausgabe muss ein reguläres Verzeichnis sein.');
    const extra = (await existingFiles(destination)).filter(name => !sourceFiles.includes(name));
    if (extra.length) throw new Error('Zusätzliche Dateien im Ausgabeordner: ' + extra.join(', ') + '. Verwende einen leeren Ordner.');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  for (const name of sourceFiles) {
    const target = join(destination, name);
    await mkdir(dirname(target), { recursive: true });
    await copyFile(join(root, name), target);
  }
  return { directory: resolve(destination), files: sourceFiles.length };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await prepareGithub();
  console.log('GitHub-Quellcodepaket: ' + result.directory + ' · ' + result.files + ' Dateien');
}
