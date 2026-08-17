const fs = require('fs');
const html = fs.readFileSync('/home/suario/xprinta-co-rebuild/sistema-design/XprintaPro Design System Guide (offline).html', 'utf8');
const match = html.match(/<script type="__bundler\/template">([\s\S]*?)<\/script>/);
if (match) {
  const jsonStr = match[1].trim();
  const template = JSON.parse(jsonStr);
  fs.writeFileSync('/home/suario/xprinta-co-rebuild/sistema-design/extracted_template.html', template);
  console.log('Extracted template successfully!');
} else {
  console.log('Template not found.');
}
