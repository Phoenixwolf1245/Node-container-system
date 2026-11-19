const boundaries=require('./lib/comment-boundaries');
// Source-only function context for NCS. Does not execute or compile code.
const IDENT='[A-Za-z_][A-Za-z0-9_]*';
function splitTop(text) {
  let pieces=[], start=0, depth=0, quote='', escape=false;
  for(let i=0;i<text.length;i++) {
    const c=text[i];
    if(quote){if(c===quote&&!escape)quote='';escape=c==='\\'&&!escape;continue;}
    const comment=boundaries.commentAt(text,i);if(comment){i=comment.end-1;continue;}
    if(c==='"'||c==="'"){quote=c;continue;}
    if('([{'.includes(c))depth++;
    if(')]}'.includes(c))depth--;
    if((c===','||c==='|')&&depth===0){pieces.push(text.slice(start,i).trim());start=i+1;}
  }
  if(text.slice(start).trim()||pieces.length)pieces.push(text.slice(start).trim());
  return pieces;
}
function mask(text) { return boundaries.mask(text); }
function definitions(text) {
  const clean=mask(text), out=[];
  const rx=new RegExp('^([ \\t]*)<def:('+IDENT+')\\((.*)\\)>[ \\t]*$','gm');
  let m;
  while((m=rx.exec(clean))) {
    const lineEnd=text.indexOf('\n',m.index);const end=lineEnd<0?text.length:lineEnd;
    const raw=text.slice(m.index,end);
    const name=m[2], open=raw.indexOf('('), close=m[0].lastIndexOf(')>');
    const params=splitTop(raw.slice(open+1,close)).map(raw=>{
      const span=boundaries.spans(raw).find(s=>s.kind==='comment'&&raw.startsWith('!{',s.start));const doc=span?raw.slice(span.start+2,span.end-(span.closed?1:0)):'';const code=boundaries.mask(raw,false).trim();
      const [n,...t]=code.split(':');return {name:n.trim(),type:t.join(':').trim()||'',description:doc.trim(),raw:code};
    });
    const short=raw.slice(close+2).match(/!<--\s*(.*)$/);
    const doc=text.slice(end).match(/^\s*"""([\s\S]*?)"""/);
    out.push({name,params,summary:short?short[1].trim():'',documentation:doc?doc[1].trim():'',offset:m.index});
  }
  // Track actual container/definition closers, not physical whitespace.
  const stack=[];const events=/<def:([A-Za-z_][A-Za-z0-9_]*)\([^\n]*?\)>|<([A-Za-z_][A-Za-z0-9_]*)>|<\/([^<>\n]*)>/g;
  for(const m of clean.matchAll(events)){
    if(m[3]!==undefined){const type=m[3].replace(/^\$/,'').split(/[\[(|]/)[0];if(!['if','loop','try'].includes(type))stack.pop();continue;}
    const name=m[1]||m[2];if(!m[1]&&['else','if','try','while','for'].includes(name))continue;
    if(m[1]){const d=out.find(x=>x.name===name&&x.offset<=m.index&&clean.slice(x.offset,m.index).trim()==='');if(d)d.qualified=[...stack,name].join('.');}
    stack.push(name);
  }
  for(const d of out)if(!d.qualified)d.qualified=d.name;
  return out;
}
function callAt(text, offset) {
  const clean=mask(text.slice(0,offset));let depth=0;
  for(let i=clean.length-1;i>=0;i--){
    if(clean[i]===')')depth++;
    if(clean[i]==='('){if(depth){depth--;continue;}
      const head=clean.slice(0,i).match(/([A-Za-z_][A-Za-z0-9_.]*)\s*$/);
      if(!head)return null;
      const args=splitTop(text.slice(i+1,offset));
      const tail=text.slice(i+1,offset);const current=/[,|]\s*$/.test(tail)?args.length:Math.max(0,args.length-1);
      return {name:head[1],args,index:current};
    }
  }
  return null;
}
function findDefinition(defs,name){return [...defs].reverse().find(d=>d.qualified===name)||(!name.includes('.')?[...defs].reverse().find(d=>d.name===name):undefined);}
module.exports={splitTop,mask,definitions,callAt,findDefinition};
