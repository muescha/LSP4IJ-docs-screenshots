// A tiny language server for a made-up language (*.sockdemo files), without dependencies, to test
// LSP4IJ's socket transports with a language IntelliJ knows nothing about.
//   node demo-lsp.mjs --socket=<port>   connect to the client       (LSP4IJ: "it connects to LSP4IJ")
//   node demo-lsp.mjs --port=<port>     listen for one client       (LSP4IJ: "LSP4IJ connects to it", or attach)
// Features: a warning on each TODO, an error on each FIXME, and a hover with the word under the mouse.
import net from 'node:net';

const arg = name => process.argv.find(a => a.startsWith(`--${name}=`))?.split('=')[1];
const log = msg => process.stderr.write(`[demo-lsp] ${msg}\n`);
const docs = new Map();

function serve(sock) {
  log(`connected ${sock.remoteAddress}:${sock.remotePort} -> ${sock.localAddress}:${sock.localPort}`);
  const send = msg => {
    const body = JSON.stringify({ jsonrpc: '2.0', ...msg });
    sock.write(`Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`);
  };
  const publish = uri => {
    const diagnostics = [];
    (docs.get(uri) ?? '').split('\n').forEach((text, line) => {
      for (const [word, severity] of [['TODO', 2], ['FIXME', 1]]) {
        for (let i = text.indexOf(word); i >= 0; i = text.indexOf(word, i + 1)) {
          diagnostics.push({ range: { start: { line, character: i }, end: { line, character: i + word.length } },
            severity, source: 'demo-lsp', message: `${word} found by demo-lsp over a socket` });
        }
      }
    });
    send({ method: 'textDocument/publishDiagnostics', params: { uri, diagnostics } });
  };
  const handle = msg => {
    const { id, method, params } = msg;
    switch (method) {
      case 'initialize':
        return send({ id, result: { capabilities: { textDocumentSync: 1, hoverProvider: true }, serverInfo: { name: 'demo-lsp', version: '1.0' } } });
      case 'textDocument/didOpen':
        docs.set(params.textDocument.uri, params.textDocument.text); return publish(params.textDocument.uri);
      case 'textDocument/didChange':
        docs.set(params.textDocument.uri, params.contentChanges.at(-1).text); return publish(params.textDocument.uri);
      case 'textDocument/didClose':
        docs.delete(params.textDocument.uri); return;
      case 'textDocument/hover': {
        const text = (docs.get(params.textDocument.uri) ?? '').split('\n')[params.position.line] ?? '';
        const word = (text.slice(0, params.position.character).match(/\w*$/)[0] + text.slice(params.position.character).match(/^\w*/)[0]);
        return send({ id, result: word ? { contents: { kind: 'markdown', value: `**demo-lsp** says: \`${word}\` (served over a socket)` } } : null });
      }
      case 'shutdown': return send({ id, result: null });
      case 'exit': log('exit'); process.exit(0);
      default: if (id !== undefined && method) send({ id, error: { code: -32601, message: `unsupported: ${method}` } });
    }
  };
  let buf = Buffer.alloc(0);
  sock.on('data', chunk => {
    buf = Buffer.concat([buf, chunk]);
    for (;;) {
      const sep = buf.indexOf('\r\n\r\n'); if (sep < 0) return;
      const len = Number(/Content-Length: (\d+)/i.exec(buf.subarray(0, sep).toString())?.[1]);
      if (buf.length < sep + 4 + len) return;
      const msg = JSON.parse(buf.subarray(sep + 4, sep + 4 + len).toString()); buf = buf.subarray(sep + 4 + len);
      log(`<- ${msg.method ?? `response ${msg.id}`}`); handle(msg);
    }
  });
  sock.on('close', () => { log('connection closed'); process.exit(0); });
}

if (arg('socket')) {
  const sock = net.createConnection({ port: Number(arg('socket')), host: '127.0.0.1' }, () => serve(sock));
  sock.on('error', e => { log(`connect failed: ${e.message}`); process.exit(1); });
} else if (arg('port')) {
  const server = net.createServer(sock => { server.close(); serve(sock); });
  server.listen(Number(arg('port')), '127.0.0.1', () => log(`listening on 127.0.0.1:${server.address().port}`));
} else {
  log('usage: demo-lsp.mjs --socket=<port> | --port=<port>'); process.exit(2);
}
