const express = require('express');
const path = require('path');
const launchMiddleware = require('launch-editor-middleware');
const renderMarkdownMiddleware = require('./render-markdown-middleware');
const app = express();
const fs = require('fs');
const { readLines } = require('./render-markdown');

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
const launcher = launchMiddleware();
app.use('/__open_editor', async (req, res, next) => {
  // Figure out the line number based on percentage, if given
  const percent = req.query.percent;
  if (percent) {
    // How many lines in the file?
    const filename = (req.query.file || '').split(':')[0];
    if (fs.existsSync(filename)) {
      const lineCount = await readLines(filename);
      const lineGuess = Math.floor(parseFloat(percent, 10) * lineCount.length);
      console.log('Go to line', lineGuess, 'in', filename);

      // Change the URL to include our new line number
      req.url = `/?file=${encodeURIComponent(filename)}:${lineGuess}:1`;
    }
  }

  return launcher(req, res, next);
});

// Return the rendered document
const filesForHead = [path.join(__dirname, 'html_head.txt')];
app.get('/', renderMarkdownMiddleware(rootFile, filesForHead));

const port = process.env.PORT || 5000;
app.listen(port);

console.log(`Markdown Author listening on ${port}`);
