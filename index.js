const express = require('express');
const path = require('path');
const launchMiddleware = require('launch-editor-middleware');
const renderMarkdownMiddleware = require('./render-markdown-middleware');
const app = express();

// Require a root markdown file to process
const rootFile = process.argv[2];
if (!rootFile) {
  console.log(`Usage: markdown-author <index.md>`);
  process.exit(-1);
}

// Serve static files in case the document refers to any
const rootDir = path.dirname(path.resolve(rootFile));
app.use(express.static(rootDir));

// Launch a text editor at the chosen line/column number
// The editor is determined by looking at running processes,
// and falls back to the EDITOR and VISUAL env vars.
//
// See https://github.com/yyx990803/launch-editor for more detail
// and a list of supported editors.
app.use('/__open_editor', launchMiddleware());

// Return the rendered document
const filesForHead = [path.join(__dirname, 'html_head.txt')];
app.get('/', renderMarkdownMiddleware(rootFile, filesForHead));

const port = process.env.PORT || 5000;
app.listen(port);

console.log(`Markdown Author listening on ${port}`);
