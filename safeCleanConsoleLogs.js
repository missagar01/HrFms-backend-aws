/**
 * SAFE Console Logs Cleanup Script - Version 2
 * 
 * This version is more careful and only removes standalone console.log lines
 */

const fs = require('fs');
const path = require('path');

const directoriesToClean = [
    path.join(__dirname, 'src', 'services'),
    path.join(__dirname, 'src', 'models'),
    path.join(__dirname, 'src', 'controllers')
];

function removeConsoleLogs(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    let lines = content.split('\n');
    let fixedLines = [];

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        // Skip lines that are ONLY console.log statements (with optional whitespace and semicolon)
        if (/^\s*console\.(log|warn|info)\([^)]*\);?\s*$/.test(line)) {
            continue; // Skip this line
        }

        // Keep all other lines
        fixedLines.push(line);
    }

    content = fixedLines.join('\n');

    // Clean up triple+ empty lines
    content = content.replace(/\n\n\n+/g, '\n\n');

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Cleaned: ${path.basename(filePath)}`);
        return true;
    }

    return false;
}

function cleanDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) {
        return;
    }

    const files = fs.readdirSync(dirPath);

    files.forEach(file => {
        const filePath = path.join(dirPath, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            cleanDirectory(filePath);
        } else if (file.endsWith('.js')) {
            removeConsoleLogs(filePath);
        }
    });
}

console.log('🧹 Running SAFE console.log cleanup...\n');

directoriesToClean.forEach(dir => {
    console.log(`📂 Cleaning: ${path.basename(dir)}`);
    cleanDirectory(dir);
});

console.log('\n✨ Safe cleanup complete!');
