const fs = require('fs');
const path = require('path');
const readline = require('readline');
const child_process = require('child_process');

// Return the contents of a file as a string,
// recursively including any referenced files
async function readMarkdownWithIncludes(filename, depth = 0) {
  try {
    const isCode = isCodeFile(filename);
    let lines = await readLines(filename);

    // Wrap the lines with a code block if it's a code file
    lines = wrapWithCodeBlock({ filename, isCode, lines, depth });
    lines = wrapWithDiv({ filename, isCode, lines, depth });

    return Promise.all(lines.map(line => processLine(line, depth))).then(
      lines => lines.join('\n')
    );
  } catch (e) {
    console.log(e);
  }
}

function isCodeFile(filename) {
  const plainFileTypes = ['.markdown', '.md', '.txt'];
  return !plainFileTypes.includes(path.extname(filename));
}

async function processLine(line, depth) {
  // Read in the referenced file if there is one, replacing
  // this line with the contents of that file.
  const includedFilename = getIncludedFilename(line);
  if (includedFilename) {
    return await readMarkdownWithIncludes(includedFilename, depth++);
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

async function compileMarkdown(text) {
  return new Promise((resolve, reject) => {
    const pandoc = child_process.exec('pandoc', [
      '-f',
      'markdown',
      '-t',
      'html5'
    ]);

    let htmlOutput = '';

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
