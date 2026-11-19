const ctx=require('../context');const high=require('./highlight');
function symbols(text){
 const clean=ctx.mask(text),defs=ctx.definitions(text),out=[],stack=[];
 // Handler sections are real children in a custom signature, with their own </d>.
 const events=/<def:([A-Za-z_][A-Za-z0-9_]*)\([^\n]*?\)>|<([?%])>|<(\$?[A-Za-z_][A-Za-z0-9_]*)>|<\/([^<>\n]*)>/g;
 for(const m of clean.matchAll(events)){
  if(m[4]!==undefined){
   const sig=m[4],base=sig.replace(/^\$/,'').replace(/&immut$/,'').split(/[\[(|]/)[0];
   if(['loop','if','try'].includes(base))continue;
   const s=stack.at(-1);if(!s)continue;
   if(base==='d'&&!['function','handler'].includes(s.kind))continue;
   if(base!=='d'&&['function','handler'].includes(s.kind))continue;
   stack.pop();s.close=m.index+m[0].length;s.bodyEnd=m.index;
   if(s.kind==='node'){s.type=base||'unsigned';s.locked=sig.startsWith('$');s.immutable=sig.endsWith('&immut');s.detail='Signature: '+sig;}
   continue;
  }
  const unique=!!m[3]?.startsWith('$'),name=m[1]||m[2]||m[3].replace(/^\$/,'');
  if(['else','try','if','for','while'].includes(name)&&!m[1])continue;
  const parent=stack.at(-1),start=m.index+(m[1]?5:unique?2:1),d=m[1]?defs.find(x=>x.offset<=m.index&&text.slice(x.offset,m.index).trim()===''):null;
  const after=text.slice(m.index+m[0].length),doc=after.match(/^\s*(?:!<--[^\n]*\n\s*)?"""([\s\S]*?)"""/);
  const handler=m[2],kind=m[1]?'function':handler?'handler':'node';
  const entry={name,qualified:parent?parent.qualified+'.'+name:name,parent,start,end:start+name.length,open:m.index,bodyStart:m.index+m[0].length,close:m.index+m[0].length,kind,type:kind==='node'?'unsigned':'def',detail:handler?(handler==='?'?'Query handlers':'Modification handlers'):(d?.summary||''),documentation:d?.documentation||doc?.[1]?.trim()||'',definition:d,locked:false,unique};
  out.push(entry);stack.push(entry);
 }
 for(const s of out){for(let parent=s.parent;parent;parent=parent.parent){if(parent.immutable)s.immutable=true;}}
 return out;
}
function candidates(text,name,offset){const all=symbols(text);const exact=all.filter(s=>s.qualified===name);const items=exact.length?exact:(!name.includes('.')?all.filter(s=>s.name===name):[]);const before=items.filter(s=>s.start<=offset);return before.length?[before.at(-1)]:items.slice(0,1);}
function references(text,name,catalog){const clean=ctx.mask(text);const out=[];for(const m of clean.matchAll(/\b[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*/g)){if(m[0]===name)out.push({start:m.index,end:m.index+m[0].length});}return out;}
module.exports={symbols,candidates,references};
