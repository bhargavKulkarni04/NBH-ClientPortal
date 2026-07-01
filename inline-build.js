import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, 'dist');
const htmlPath = path.join(distDir, 'index.html');

if (!fs.existsSync(htmlPath)) {
  console.error("Vite build has not been run. Please run 'npm run build' first.");
  process.exit(1);
}

console.log("Reading built files...");
let html = fs.readFileSync(htmlPath, 'utf8');

// Inject Error Catcher for debugging Apps Script
const errorCatcher = `
<script>
  window.onerror = function(msg, url, lineNo, columnNo, error) {
    var errDiv = document.createElement('div');
    errDiv.style.cssText = 'background: #fee2e2; color: #dc2626; padding: 20px; margin: 20px; font-family: monospace; z-index: 999999; position: fixed; top: 0; left: 0; right: 0; border: 2px solid red;';
    errDiv.innerHTML = '<b>CRITICAL ERROR:</b><br/>' + msg + '<br/>Line: ' + lineNo + '<br/>Column: ' + columnNo;
    if (error && error.stack) {
      errDiv.innerHTML += '<br/><br/><b>Stack:</b><br/>' + error.stack.replace(/\\n/g, '<br/>');
    }
    document.body.appendChild(errDiv);
    return false;
  };
  
  window.addEventListener('unhandledrejection', function(event) {
    var errDiv = document.createElement('div');
    errDiv.style.cssText = 'background: #fee2e2; color: #dc2626; padding: 20px; margin: 20px; font-family: monospace; z-index: 999999; position: fixed; top: 100px; left: 0; right: 0; border: 2px solid red;';
    errDiv.innerHTML = '<b>UNHANDLED PROMISE REJECTION:</b><br/>' + (event.reason ? event.reason.toString() : 'Unknown Error');
    if (event.reason && event.reason.stack) {
      errDiv.innerHTML += '<br/><br/><b>Stack:</b><br/>' + event.reason.stack.replace(/\\n/g, '<br/>');
    }
    if (document.body) document.body.appendChild(errDiv);
    else window.onload = function() { document.body.appendChild(errDiv); };
  });
</script>
`;
html = html.replace('<head>', '<head>\n' + errorCatcher);

// 1. Inline CSS
const cssRegex = /<link\s+[^>]*href="\/assets\/([^"]+\.css)"[^>]*>/g;
html = html.replace(cssRegex, (match, cssFile) => {
  const absolutePath = path.join(distDir, 'assets', cssFile);
  if (fs.existsSync(absolutePath)) {
    console.log(`Inlining CSS: ${cssFile}`);
    const cssContent = fs.readFileSync(absolutePath, 'utf8');
    return `<style>\n${cssContent}\n</style>`;
  }
  return match;
});

// 2. Inline JS
let scriptContentToInject = '';
const jsRegex = /<script\s+[^>]*src="\/assets\/([^"]+\.js)"[^>]*><\/script>/g;
html = html.replace(jsRegex, (match, jsFile) => {
  const absolutePath = path.join(distDir, 'assets', jsFile);
  if (fs.existsSync(absolutePath)) {
    console.log(`Inlining JS: ${jsFile}`);
    const jsContent = fs.readFileSync(absolutePath, 'utf8');
    // Instead of replacing the script tag in-place (which puts it in <head>),
    // we return empty string to remove it from <head>, and we will append it 
    // to the end of the body later.
    scriptContentToInject = `<script type="text/javascript">\n${jsContent}\n</script>`;
    return '';
  }
  return match;
});

// Inject script at the end of body
if (scriptContentToInject) {
  html = html.replace('</body>', () => `${scriptContentToInject}\n</body>`);
}

// 3. Inline images as Base64 (to prevent loading issues inside Google Apps Script domain)
const images = [
  'nbh_logo.png',
  'support-illustration.png',
  'login-illustration.png',
  'favicon.svg',
  'nbh-icon.svg'
];

images.forEach(img => {
  const localPath = path.join(distDir, img);
  if (fs.existsSync(localPath)) {
    console.log(`Inlining image: ${img}`);
    const imgData = fs.readFileSync(localPath);
    const ext = path.extname(img).replace('.', '');
    const mime = ext === 'svg' ? 'image/svg+xml' : `image/${ext}`;
    const base64 = `data:${mime};base64,${imgData.toString('base64')}`;

    // Replace exact instances with base64
    html = html.replaceAll(`/${img}`, base64);
    html = html.replaceAll(img, base64);
  }
});

// Save single page to dist/Index.html (Google Apps Script HTML files must have capitalization like Index.html)
const outputPath = path.join(distDir, 'Index.html');
fs.writeFileSync(outputPath, html, 'utf8');
console.log("\n[SUCCESS] Bundled complete portal into a single self-contained file at:");
console.log(outputPath);
