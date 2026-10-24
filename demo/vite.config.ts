import { execFile } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

const demoDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(demoDir, '..');
const promptsDir = path.join(packageRoot, 'prompts');
const fixturesDir = path.join(packageRoot, 'fixtures');
const FIXTURE_NAME = /^[a-z0-9-]+\.[a-z0-9-]+(--[a-z0-9-]+)?$/;

const run = promisify(execFile);

async function generateTemplates(): Promise<string | null> {
  try {
    await run(process.execPath, [path.join(packageRoot, 'scripts', 'build-templates.mjs')], { cwd: packageRoot });
    return null;
  } catch (error) {
    const { stderr, message } = error as { stderr?: string; message: string };
    return stderr?.trim() || message;
  }
}

/** Re-embeds prompts/**\/*.md into src/generated/ whenever a template or meta.json changes. */
function promptTemplates(): Plugin {
  return {
    name: 'symthink-prompt-templates',
    async buildStart() {
      const error = await generateTemplates();
      if (error) this.error(error);
    },
    configureServer(server) {
      server.watcher.add(promptsDir);
      const onChange = async (file: string) => {
        if (!file.startsWith(promptsDir)) return;
        const error = await generateTemplates();
        if (error) {
          server.config.logger.error(error);
          server.ws.send({ type: 'error', err: { message: error, stack: '' } });
        }
      };
      server.watcher.on('change', onChange);
      server.watcher.on('add', onChange);
      server.watcher.on('unlink', onChange);
    },
  };
}

/** Dev-only endpoint behind the demo's "Save fixture" button: POST /__fixtures/<name> writes fixtures/<name>.json. */
function fixtureWriter(): Plugin {
  return {
    name: 'symthink-fixture-writer',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__fixtures/', (req, res) => {
        const name = decodeURIComponent((req.url ?? '').replace(/^\//, ''));
        if (req.method !== 'POST' || !FIXTURE_NAME.test(name)) {
          res.statusCode = 400;
          res.end('Expected POST /__fixtures/<prompt-id> or /__fixtures/<prompt-id>--<variant>');
          return;
        }
        let body = '';
        req.on('data', (chunk) => (body += chunk));
        req.on('end', async () => {
          try {
            const json = JSON.parse(body);
            await writeFile(path.join(fixturesDir, `${name}.json`), `${JSON.stringify(json, null, 2)}\n`);
            res.statusCode = 204;
            res.end();
          } catch (error) {
            res.statusCode = 400;
            res.end((error as Error).message);
          }
        });
      });
    },
  };
}

export default defineConfig({
  root: demoDir,
  plugins: [react(), promptTemplates(), fixtureWriter()],
  server: {
    fs: { allow: [packageRoot] },
  },
  build: {
    outDir: path.join(demoDir, 'dist'),
    emptyOutDir: true,
  },
});
