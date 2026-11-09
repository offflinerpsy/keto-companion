const fs=require('node:fs'),path=require('node:path');
const [input,output]=process.argv.slice(2);if(!input||!output)throw Error('Expected input and output paths');
const dir=__dirname,parts=['quagga','gl-matrix','lodash','babel'].map(n=>{const s=fs.readFileSync(path.join(dir,'LICENSE-'+n),'utf8');if(s.includes('*/'))throw Error('Unsafe license text');return '=== '+n+' MIT ===\n'+s});
const header='/*!\nQuagga2 1.13.0 and bundled component notices\nregenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE\n'+parts.join('\n\n')+'\n*/\n';fs.writeFileSync(output,Buffer.concat([Buffer.from(header),fs.readFileSync(input)]));
