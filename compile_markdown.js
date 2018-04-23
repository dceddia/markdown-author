const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Return the contents of a file as a string,
// recursively including any referenced files
async function includeFile(filename, isCode = false, wrapWithDiv = true) {
  const lines = await readLines(filename);

  // Wrap the lines with a code block if it's a code file
  if (isCode) {
    const lang = path
      .extname(filename)
      .replace(/^\./, '')
      .replace(/_.*$/, '');
    lines.unshift('``` ' + lang);
    lines.push('```');
  }

  // Wrap the lines with a <div>
  if (wrapWithDiv) {
    lines.unshift(
      `<div class="file ${
        isCode ? 'file--code' : ''
      }" data-filename="${filename}">`
    );
    lines.push('</div>');
  }

  return Promise.all(
    lines.map(async line => {
      if (line.startsWith('<<(') || line.startsWith('<<[')) {
        const match = line.match(/^<<\((.*)\)|<<\[(.*)\]$/);
        if (match && (match[1] || match[2])) {
          // Find the referenced file
          const refFile = match[1] || match[2];
          const refFileIsCode = !!match[1];
          const moreLines = await includeFile(refFile, refFileIsCode);
          return moreLines;
        } else {
          // No match? Just return the line
          return line;
        }
      } else {
        return line;
      }
    })
  ).then(lines => lines.join('\n'));
}

includeFile(process.argv[2], false, false).then(lines => console.log(lines));
