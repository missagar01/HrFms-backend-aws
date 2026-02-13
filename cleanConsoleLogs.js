/**
 * Clean Console Logs Script
 * 
 * This script removes all console.log, console.warn, console.info statements
 * while keeping console.error for production error handling
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

    // Remove console.log statements
    content = content.replace(/\s*console\.log\([^)]*\);?\s*/g, '');

    // Remove console.warn statements  
    content = content.replace(/\s*console\.warn\([^)]*\);?\s*/g, '');

    // Remove console.info statements
    content = content.replace(/\s*console\.info\([^)]*\);?\s*/g, '');

    // Clean up multiple empty lines (max 2 consecutive)
    content = content.replace(/\n\n\n+/g, '\n\n');

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Cleaned: ${filePath}`);
        return true;
    }

    return false;
}

function cleanDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) {
        console.log(`⚠️  Directory not found: ${dirPath}`);
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

console.log('🧹 Starting console.log cleanup...\n');

directoriesToClean.forEach(dir => {
    console.log(`📂 Cleaning: ${dir}`);
    cleanDirectory(dir);
});

console.log('\n✨ Cleanup complete!');
