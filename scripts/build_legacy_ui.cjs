// Rebuild the existing, separate Azure/Entra/MCP UI; never deploy from this script.
const path=require('node:path');
const esbuild=require('../ui-sdk/node_modules/esbuild');
esbuild.buildSync({entryPoints:['service/static/app.js'],bundle:true,format:'esm',target:'es2022',outfile:'service/static/app.bundle.js',minify:true,nodePaths:[path.resolve('ui-sdk/node_modules')],legalComments:'inline'});
console.log('Legacy UI rebuilt from service/static/app.js; SaaS assets remain separate.');
