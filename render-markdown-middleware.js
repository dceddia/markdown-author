const { readMarkdownWithIncludes } = require('./render-markdown');

function renderMarkdownMiddleware(rootFile) {
  return (req, res, next) => {
    // Render the Markdown, starting at the rootFile, and return the result
    readMarkdownWithIncludes(rootFile).then(text => {
      res.send(text);
    });
  };
}

module.exports = renderMarkdownMiddleware;
