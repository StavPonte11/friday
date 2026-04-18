const fs = require('fs');
let content = fs.readFileSync('lib/prompt-merge.ts', 'utf8');
// Replace the broken regex that doesn't allow hyphens in branch slug
// Old: /^[^\/]+\/[^\-]+--(.+)$/  (stops matching at first hyphen in branch slug)
// New: /^[^\/]+\/.+?--(.+)$/     (lazy match allows hyphens in branch slug)
content = content.replace(
  "featurePromptName.match(/^[\\/\\^]+\\/[^\\-]+--(.+)$/);",
  "featurePromptName.match(/^[^\\/]+\\/.+?--(.+)$/);"
);
// Try direct string approach
const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('match(') && lines[i].includes('[^-]')) {
    lines[i] = "    const match = featurePromptName.match(/^[^\\/]+\\/.+?--(.+)$/);";
    console.log('Fixed line', i+1, ':', lines[i]);
  }
}
content = lines.join('\n');
fs.writeFileSync('lib/prompt-merge.ts', content);
console.log('Done');
