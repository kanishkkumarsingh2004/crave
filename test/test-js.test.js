const { transform } = require('@babel/core');
const fs = require('fs');
const code = fs.readFileSync('components/test-ts.tsx', 'utf-8');
transform(code, {
  filename: 'components/test-ts.tsx',
  configFile: './babel.config.js',
}, (err, result) => {
  if (err) console.error('ERROR:', err.message);
  else console.log('OUTPUT:', result.code.substring(0, 200));
});
