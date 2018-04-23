const path = require('path');
const {
  readMarkdownWithIncludes,
  compileMarkdown
} = require('./render-markdown');

function renderMarkdownMiddleware(rootFile, filesForHead) {
  return (req, res, next) => {
    // Render the Markdown, starting at the rootFile, and return the result
    const basedir = path.dirname(path.resolve(rootFile));
    readMarkdownWithIncludes(rootFile, basedir)
      .then(markdown => compileMarkdown(markdown, filesForHead))
      .then(text => res.send(text));
  };
}

module.exports = renderMarkdownMiddleware;
