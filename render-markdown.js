const fs = require('fs');
const path = require('path');
const readline = require('readline');
const child_process = require('child_process');

// Return the contents of a file as a string,
// recursively including any referenced files
async function readMarkdownWithIncludes(filename, basedir, depth = 0) {
  const isCode = isCodeFile(filename);
  let lines = await readLines(filename);

  // Wrap the lines with a code block if it's a code file
  lines = wrapWithCodeBlock({ filename, isCode, lines, depth });
  lines = wrapWithDiv({ filename, isCode, lines, depth });

  return Promise.all(lines.map(line => processLine(line, depth, basedir))).then(
    lines => lines.join('\n') + '\n' // Add an extra newline
  );
}

function isCodeFile(filename) {
  const plainFileTypes = ['.markdown', '.md', '.txt'];
  return !plainFileTypes.includes(path.extname(filename));
}

async function processLine(line, depth, basedir) {
  // Read in the referenced file if there is one, replacing
  // this line with the contents of that file.
  const includedFilename = getIncludedFilename(line);
  if (includedFilename) {
    return await readMarkdownWithIncludes(
      path.resolve(basedir, includedFilename),
      basedir,
      depth++
    );
  }

  return line;
}

function getIncludedFilename(line) {
  // Includes look like:
  // <<(path/to/file.md)
  // <<[path/to/file.md]
  const match = line.match(/^<<\((.*)\)|<<\[(.*)\]$/);
  return match ? match[1] || match[2] : null;
}

function wrapWithCodeBlock({ filename, lines, isCode }) {
  if (!isCode) {
    return lines;
  }

  const lang = path
    .extname(filename)
    .replace(/^\./, '')
    .replace(/_.*$/, '');
  return ['``` ' + lang, ...lines, '```'];
}

function wrapWithDiv({ filename, lines, isCode, depth }) {
  // Don't wrap the entire document in a div
  if (depth === 0) {
    return lines;
  }

  return [
    `<div class="file ${
      isCode ? 'file--code' : ''
    }" data-filename="${filename}">`,
    ...lines,
    `</div>`
  ];
}

async function readLines(filename) {
  return new Promise((resolve, reject) => {
    let lines = [];

    var rl = readline.createInterface({
      input: fs.createReadStream(filename)
    });

    rl.on('line', function(line) {
      lines.push(line);
    });

    rl.on('close', function() {
      resolve(lines);
    });

    rl.on('error', error => reject(error));
  });
}

async function compileMarkdown(text, headerFiles = []) {
  return new Promise((resolve, reject) => {
    // Build a list of headers to include. The resulting arguments to pandoc will look like
    // -H file1 -H file2 ...
    const headers = headerFiles.reduce((args, filename) => {
      return [...args, '-H', filename];
    }, []);

    const args = ['-f', 'markdown', '-t', 'html5', ...headers];

    // Start pandoc
    const pandoc = child_process.spawn('pandoc', args);

    let htmlOutput = '';

    // Pass the text into pandoc, store the intermediate results, and resolve when done
    pandoc.stdout.on('data', data => (htmlOutput += data));
    pandoc.on('close', () => resolve(htmlOutput));
    pandoc.on('error', error => reject(error));

    pandoc.stdin.write(text);
    pandoc.stdin.end();
  });
}

module.exports = {
  readMarkdownWithIncludes,
  compileMarkdown
};
