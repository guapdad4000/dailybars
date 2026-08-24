const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

const sourceDir = __dirname;
const outputDir = path.join(sourceDir, 'dist');

fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(outputDir, { recursive: true });

for (const filename of fs.readdirSync(sourceDir).filter((name) => name.endsWith('.js') && name !== 'build.js')) {
    const sourcePath = path.join(sourceDir, filename);
    const result = babel.transformFileSync(sourcePath, {
        presets: ['@babel/preset-react'],
        sourceMaps: false,
        comments: true,
    });

    const output = `(function () {\n${result.code}\n})();\n`;
    fs.writeFileSync(path.join(outputDir, filename), output);
}

console.log(`Compiled ${fs.readdirSync(outputDir).length} files to js/dist`);