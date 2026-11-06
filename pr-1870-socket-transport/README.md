# Socket transport tests for LSP4IJ PR 1870

Test files for [redhat-developer/lsp4ij#1870](https://github.com/redhat-developer/lsp4ij/pull/1870), which lets a
user-defined language server talk LSP over a TCP socket instead of its standard input and output. Tested against the
PR at commit `28cb85c2`, in `./gradlew runIde` (IntelliJ IDEA Ultimate 2024.2), on macOS with Node.js 26.

The GUI was first checked by hand. The tests below were then set up and run by Claude Code, which clicked through
the GUI (computer use) with the files in this folder.

## Results

| # | Mode | Server | Port | Checked | Screenshot |
|---|---|---|---|---|---|
| 1 | Start the language server, it connects to LSP4IJ | `vscode-css-language-server --socket=${port}`, from LSP4IJ's CSS template | Auto | diagnostics (`Unknown property: 'colr'`), document colors, hover | [1](screenshots/1-css-start-it-connects-auto.jpg) |
| 2 | Start the language server, it connects to LSP4IJ | `vscode-html-language-server --socket=${port}`, from LSP4IJ's HTML template | Fixed 5007 | hover and document highlight in the LSP console's traces | [2](screenshots/2-html-start-it-connects-fixed-5007.jpg) |
| 3 | Start the language server, LSP4IJ connects to it | [`demo-lsp.mjs`](demo-lsp/demo-lsp.mjs) for the made-up `*.sockdemo` language, imported from [a template](demo-lsp/template-start-and-connect/template.json) | Auto | diagnostics, hover | [3](screenshots/3-demo-start-lsp4ij-connects-auto.jpg) |
| 4 | Attach to a running language server | the same server, started by hand on 6010, imported from [a template](demo-lsp/template-attach/template.json) | 6010 | diagnostics, hover | [4](screenshots/4-demo-attach-6010.jpg) |

IntelliJ supports CSS and HTML itself, so for 1 and 2 the LSP console's traces and the open connections (`lsof`) show
what came over the socket. IntelliJ knows nothing about `*.sockdemo` and `*.sockattach`, so everything shown for 3
and 4 came from the language server.

## Files

- [`sample/`](sample): the files to open, `style.css`, `index.html`, `hello.sockdemo` and `hello.sockattach`.
- [`demo-lsp/demo-lsp.mjs`](demo-lsp/demo-lsp.mjs): a tiny language server without dependencies. It reports a
  warning on each `TODO`, an error on each `FIXME`, and a hover with the word under the mouse.
  - `node demo-lsp.mjs --socket=<port>` connects to the client.
  - `node demo-lsp.mjs --port=<port>` listens for one client.
- [`demo-lsp/template-start-and-connect`](demo-lsp/template-start-and-connect) and
  [`demo-lsp/template-attach`](demo-lsp/template-attach): templates for *Import template...* in the New Language
  Server dialog, with a `socket` object.
- [`ts-bridge/ts-socket-bridge.mjs`](ts-bridge/ts-socket-bridge.mjs): a bridge from a socket to
  `typescript-language-server --stdio`, as `typescript-language-server` 6.0.2 only takes `--stdio`.

## Steps

Open this repository as a project in the IDE started with `./gradlew runIde` from a checkout of the PR. `node` must
be on the `PATH` of the IDE, or replace `node` in the commands with its full path.

1. **CSS:** *Settings > Languages & Frameworks > Language Servers > +*, *Choose template... > CSS Language Server*.
   Select *Socket (experimental)*, *Start the language server, it connects to LSP4IJ*, *Auto*, and set the command to
   `node <vscode-langservers-extracted>/lib/css-language-server/node/cssServerMain.js --socket=${port}`. Open
   `sample/style.css`.
   The template's installer runs when the first `.css` file opens and replaces the command with `... --stdio`, while
   the transport stays on Socket; set the command back to `--socket=${port}` afterwards.
2. **HTML:** the same with the HTML template and `.../html-language-server/node/htmlServerMain.js --socket=${port}`,
   with *Fixed* 5007, and *Trace: messages* in the *Debug* tab. Open `sample/index.html`, hover a tag, and look at
   the *Traces* in the *LSP Consoles*.
3. **Demo, LSP4IJ connects to it:** *+*, *Import template...*, choose `demo-lsp/template-start-and-connect`. Open
   `sample/hello.sockdemo`.
4. **Demo, attach:** run `node demo-lsp/demo-lsp.mjs --port=6010` in a terminal, then *+*, *Import template...*,
   choose `demo-lsp/template-attach`. Open `sample/hello.sockattach`. The terminal shows what LSP4IJ sends:

   ```
   [demo-lsp] listening on 127.0.0.1:6010
   [demo-lsp] connected 127.0.0.1:53861 -> 127.0.0.1:6010
   [demo-lsp] <- initialize
   [demo-lsp] <- initialized
   [demo-lsp] <- workspace/didChangeConfiguration
   [demo-lsp] <- textDocument/didOpen
   [demo-lsp] <- textDocument/hover
   ```

   The demo server takes one connection and ends with it, so start it again before LSP4IJ restarts the server.
