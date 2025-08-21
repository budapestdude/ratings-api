// Simple test to verify the build works
const fs = require('fs');
const path = require('path');

console.log('Testing build output...');
console.log('Current directory:', process.cwd());

const distPath = path.join(process.cwd(), 'dist');
const indexPath = path.join(distPath, 'index.js');

if (fs.existsSync(distPath)) {
    console.log('✅ dist directory exists');
    console.log('Contents:', fs.readdirSync(distPath));
    
    if (fs.existsSync(indexPath)) {
        console.log('✅ dist/index.js exists');
        console.log('File size:', fs.statSync(indexPath).size, 'bytes');
    } else {
        console.log('❌ dist/index.js NOT found');
    }
} else {
    console.log('❌ dist directory NOT found');
    console.log('Available directories:', fs.readdirSync('.').filter(f => fs.statSync(f).isDirectory()));
}

// Try to find any index.js files
console.log('\nSearching for index.js files...');
function findFiles(dir, filename, maxDepth = 3, currentDepth = 0) {
    if (currentDepth >= maxDepth) return;
    
    try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
                findFiles(fullPath, filename, maxDepth, currentDepth + 1);
            } else if (file === filename) {
                console.log('Found:', fullPath);
            }
        }
    } catch (e) {
        // Ignore permission errors
    }
}

findFiles('.', 'index.js');