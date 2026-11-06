// Bridges a TCP socket to typescript-language-server, which only talks over stdio.
//   node ts-socket-bridge.mjs connect <port> [host]  connect to a listening client (LSP4IJ: "it connects to LSP4IJ")
//   node ts-socket-bridge.mjs listen <port> [host]   listen for one client (LSP4IJ: "LSP4IJ connects to it", or attach)
import net from 'node:net'; import { spawn } from 'node:child_process'; import { homedir } from 'node:os';
const [mode, portArg, host = '127.0.0.1'] = process.argv.slice(2);
const port = Number(portArg);
const cli = process.env.TS_LS_CLI ?? `${homedir()}/.lsp4ij/lsp/typescript-language-server/node_modules/typescript-language-server/lib/cli.mjs`;
const log = msg => process.stderr.write(`[ts-socket-bridge] ${msg}\n`);
function bridge(sock) {
  log(`connected ${sock.remoteAddress}:${sock.remotePort}, starting typescript-language-server --stdio`);
  const ls = spawn(process.execPath, [cli, '--stdio'], { stdio: ['pipe', 'pipe', 'inherit'] });
  sock.pipe(ls.stdin); ls.stdout.pipe(sock);
  sock.on('close', () => { log('socket closed'); ls.kill(); });
  ls.on('exit', code => { log(`typescript-language-server exited with ${code}`); sock.destroy(); process.exit(code ?? 0); });
}
if (mode === 'connect') {
  const sock = net.createConnection({ port, host }, () => bridge(sock));
  sock.on('error', e => { log(`connect failed: ${e.message}`); process.exit(1); });
} else if (mode === 'listen') {
  const server = net.createServer(sock => { server.close(); bridge(sock); });
  server.listen(port, host, () => log(`listening on ${host}:${server.address().port}`));
} else {
  log('usage: ts-socket-bridge.mjs connect|listen <port> [host]'); process.exit(2);
}
