// Data-only catalog: extensions can add JSON metadata without running JavaScript.
const fs=require('node:fs'), path=require('node:path');
const builtin=require('../builtins');
const baseMenus=require('../menus');
const safeName=/^[A-Za-z_][A-Za-z0-9_.]*$/;
const coreSignatures=['str','abc','bool','binary','fstr','fint','int','pint','nint','float','list','dict','any','matrix','node','log'];
// Read metadata only, never execute user source. Schema blocks must be root-level.
function sourceModes(text){
 const modes=[]; const clean=require('../context').mask(text);
 const close=/^<\/node>\s*$/gm; let m;
 while((m=close.exec(clean))){const prefix=clean.slice(0,m.index);const opens=[...prefix.matchAll(/^<([A-Za-z_]\w*)>[ \t]*$/gm)];const head=opens.at(-1);if(!head||head[1]==='node')continue;const block=text.slice(head.index,m.index+m[0].length);const rawName=head[1];const name=rawName.startsWith("__")&&rawName.endsWith("__")?rawName.slice(2,-2):rawName.startsWith("_")&&rawName.endsWith("_")?rawName.slice(1,-1):rawName;if(!safeName.test(name)||name==="node")continue;
  const field=k=>{const m=block.match(new RegExp('^\\s*<'+k+'>([\\s\\S]*?)</(fstr|str)>','m'));if(!m)return '';let raw=m[1].trim();if(m[2]==='fstr'&&raw.startsWith('f"'))raw=raw.slice(1);try{return JSON.parse(raw);}catch{return raw.startsWith("'")&&raw.endsWith("'")?raw.slice(1,-1):'';}};
  // Replace only the single-quoted data field of a sample. Never evaluate fstr code.
  let example=field('test');example=example.replace(/(>\s*)'([^'\r\n]*)'(\s*<\/)/g,(_,a,b,c)=>a+JSON.stringify(b)+c);
  let info=field('info').replace(/\{self\.test\}/g,example).replace(/\/n/g,'\n');if(typeof info!=='string'||typeof example!=='string')continue;
  modes.push({name,signature:true,planned:name!=='matrix',label:name+' (custom mode)',definition:info.split('\n')[0]||'Custom mode',detail:info,example,template:example.replace(/[$}\\]/g,c=>'\\'+c)+'$0'});
 }return modes;
}
function load(folders=[],sourceFiles=[]){
 const docs=Object.assign(Object.create(null),builtin), signatures=new Set(coreSignatures), nodes=[...baseMenus.nodes], errors=[];
 function add(data){if(!safeName.test(data.name||''))throw Error('invalid name');if(data.signature===true)signatures.add(data.name);if(data.definition||data.detail||data.example)docs[data.name]={name:data.name,definition:String(data.definition||''),detail:String(data.detail||''),example:String(data.example||''),planned:data.planned!==false};if(typeof data.template==='string')nodes.push([String(data.label||data.name),data.template,String(data.definition||'Custom node')+(data.planned!==false?' (planned/editor only)':'')]);}
 function readSource(full){try{if(fs.statSync(full).size>2*1024*1024)throw Error('schema source exceeds 2 MiB');for(const mode of sourceModes(fs.readFileSync(full,'utf8')))add(mode);}catch(e){errors.push(`${full}: ${e.message}`);}}
 for(const folder of folders){let entries;try{entries=fs.readdirSync(folder).sort();}catch(e){if(e.code!=='ENOENT')errors.push(`${folder}: ${e.message}`);continue;}
  for(const file of entries.filter(f=>f.endsWith('.ncs')))readSource(path.join(folder,file));
  for(const file of entries.filter(f=>f.endsWith('.json'))){const full=path.join(folder,file);try{
   const data=JSON.parse(fs.readFileSync(full,'utf8'));if(!data||typeof data!=='object'||Array.isArray(data))throw Error('expected an object');
   if(!safeName.test(data.name||''))throw Error('invalid name');
   if(data.signature===true)signatures.add(data.name);
   if(data.definition||data.detail||data.example){docs[data.name]={name:data.name,definition:String(data.definition||''),detail:String(data.detail||''),example:String(data.example||''),planned:data.planned!==false};}
   if(typeof data.template==='string')nodes.push([String(data.label||data.name),data.template,String(data.definition||'Custom node')+(data.planned!==false?' (planned/editor only)':'')]);
  }catch(e){errors.push(`${full}: ${e.message}`);}}
 }
 for(const full of new Set(sourceFiles))readSource(full);
 return {docs,signatures,nodes,errors};
}
module.exports={load,sourceModes};
