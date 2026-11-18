const fs = require('fs');
const path = require('path');

const inlineScript = '<script>(function(){if("serviceWorker" in navigator){navigator.serviceWorker.getRegistrations().then(function(rs){for(var r of rs){r.unregister();}});}if("caches" in window){caches.keys().then(function(ks){for(var k of ks){caches.delete(k);}});}})();</script>';

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory() && f !== 'node_modules' && f !== 'uploads' && f !== 'images') {
      processDir(full);
    } else if (f.endsWith('.html')) {
      let content = fs.readFileSync(full, 'utf8');

      // Remove manifest link if present
      content = content.replace(/<link\s+rel=["']manifest["'][^>]*>/gi, '');

      // Bump css and js versions to v=3
      content = content.replace(/bootstrap\.min\.css(\?v=[0-9]+)?/g, 'bootstrap.min.css?v=3');
      content = content.replace(/bootstrap-icons\.min\.css(\?v=[0-9]+)?/g, 'bootstrap-icons.min.css?v=3');
      content = content.replace(/style\.css(\?v=[0-9]+)?/g, 'style.css?v=3');
      content = content.replace(/bootstrap\.bundle\.min\.js(\?v=[0-9]+)?/g, 'bootstrap.bundle.min.js?v=3');

      // Ensure inline unregister script is at top of <head>
      if (!content.includes('serviceWorker" in navigator')) {
        content = content.replace(/<head[^>]*>/i, (match) => `${match}\n  ${inlineScript}`);
      }

      fs.writeFileSync(full, content, 'utf8');
      console.log('Updated: ' + full);
    }
  }
}

processDir(path.join(__dirname, '..', 'public'));
console.log('All HTML files patched successfully.');
