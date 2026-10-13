// Runs the whole browser test-suite against a throwaway static server.
//   npm test
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { spawn } from 'node:child_process';

const root = new URL('..', import.meta.url).pathname;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.json': 'application/json' };
const server = createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (path.endsWith('/')) path += 'index.html';
  const file = normalize(join(root, path));
  if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(body);
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;
const tmp = process.env.TEST_OUT || '/tmp';

function run(script, args) {
  return new Promise((resolve) => {
    console.log(`\n=== ${script} ${args.slice(1).join(' ')}`);
    const p = spawn(process.execPath, [join(root, 'tests', script), ...args], { stdio: ['ignore', 'pipe', 'inherit'] });
    let out = '';
    p.stdout.on('data', (d) => { out += d; process.stdout.write(d); });
    p.on('close', (code) => resolve({ code, out }));
  });
}

let failed = 0;
const check = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) failed++; };

let r = await run('ui-flow.mjs', [base, tmp]);
check(r.code === 0 && !r.out.includes('FAIL') && r.out.includes('no page errors'), 'menu + save flow');

r = await run('offline.mjs', [base]);
check(r.code === 0 && !r.out.includes('FAIL'), 'offline play');

r = await run('smoke.mjs', [base + '?bot=1&speed=12', tmp + '/bot', '15000']);
const runInfo = JSON.parse(r.out.match(/run: (.*)/)[1]);
check(r.out.includes('errors: none'), 'bot run has no errors');
check(runInfo && runInfo.t > 60 && runInfo.kills > 50, `bot run progresses (${runInfo && runInfo.t}s, ${runInfo && runInfo.kills} kills)`);

r = await run('perf.mjs', [base, '15', '1', tmp + '/perf.png', 'crowd']);
const perf = JSON.parse(r.out.slice(r.out.indexOf('{'), r.out.lastIndexOf('}') + 1));
check(perf.enemies.max >= 400, `crowd test reaches ${perf.enemies.max} enemies`);
check(parseFloat(perf.updateMs.avg) < 4, `simulation ${perf.updateMs.avg} ms/frame with a full crowd`);

server.close();
console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
