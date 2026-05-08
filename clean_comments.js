const fs = require('fs');
const path = require('path');

const cleanFile = (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Remove block comments (careful with these, but usually safe if well-formed)
  content = content.replace(/\/\*[\s\S]*?\*\//g, '');
  
  // Remove large decorative headers
  content = content.replace(/\/\/ ={10,}.*\n/g, '');
  content = content.replace(/\/\/ ── .*\n/g, '');
  
  // Remove lines that are purely comments (ignoring inline comments to preserve URLs like http://)
  content = content.replace(/^\s*\/\/.*$/gm, '');
  
  // Condense multiple empty lines into a single empty line
  content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
  
  fs.writeFileSync(filePath, content, 'utf8');
};

const walkSync = (dir) => {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      // Ignore build and module directories
      if (!['node_modules', '.git', 'dist'].includes(file)) {
        walkSync(fullPath);
      }
    } else if (fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
      cleanFile(fullPath);
    }
  }
};

// Clean both frontend and backend
walkSync(path.join(__dirname, 'backend'));
walkSync(path.join(__dirname, 'frontend', 'src'));
console.log('✅ Codebase comments cleaned up successfully!');
