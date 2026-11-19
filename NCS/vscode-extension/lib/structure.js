// Structural checks independent of semantic analysis. Preserve source offsets.
const {mask,spans}=require('./comment-boundaries');
const nav=require('./navigation');
function check(text){
 const out=[],stack=[],clean=mask(text),lines=clean.split('\n'),visible=mask(text,false).split('\n');
 // Pre-identify complete multiline scalar nodes. Do not mistake literal bodies
 // (which can be blank in the string-masked buffer) for dictionary children.
 const symbols=nav.symbols(text),scalarLines=new Set();
 const lineAt=o=>text.slice(0,o).split('\n').length-1;
 for(const s of symbols){if(s.kind!=='node'||s.bodyEnd===undefined||['dict','node'].includes(s.type)||symbols.some(c=>c.parent===s))continue;
  const first=lineAt(s.open),last=lineAt(s.bodyEnd);for(let i=first+1;i<last;i++)scalarLines.add(i);
 }

 const add=(line,start,end,message,code='structure',severity='error')=>out.push({line,start,end:Math.max(start+1,end),message,code,severity});
 const close=(kind,i,s,e)=>{const top=stack.at(-1);if(!top||!kind.includes(top.kind)){add(i,s,e,'Unexpected closing delimiter.','unexpected-close');return null;}return stack.pop();};
 const push=(kind,i,s,e,extra={})=>stack.push({kind,line:i,start:s,end:e,...extra});
 for(const [i,raw] of lines.entries()){
  if(scalarLines.has(i))continue;
  const indent=raw.search(/\S/);if(indent<0){if(visible[i].trim()&&stack.at(-1)?.kind!=='throw')add(i,0,visible[i].length,'Unexpected text outside a node or statement.','stray-text');continue;}let t=raw.trim();let start=indent;
  if(t.startsWith('|')&&t.endsWith('|')){t=t.slice(1,-1).trim();start=raw.indexOf(t,indent+1);}
  const end=start+t.length;
  // This bootstrap grammar is line-based: parentheses and collection brackets
  // (but not < or > comparisons) must balance on each executable line.
  const brackets=[];for(let j=0;j<t.length;j++){const c=t[j];if('([{'.includes(c))brackets.push([c,j]);else if(')]}'.includes(c)){const prior=brackets.pop();if(!prior||'([{'.indexOf(prior[0])!==')]}'.indexOf(c)){add(i,start+j,start+j+1,'Unexpected or mismatched bracket.','mismatched-bracket');break;}}}if(brackets.length){const [,j]=brackets[0];add(i,start+j,start+j+1,'Unclosed bracket.','unclosed-bracket');}

  const parent=stack.at(-1);
  if(parent?.kind==='data'&&!t.startsWith('</')&&!/^<(?:[?%]>|def:|\$?[A-Za-z_]\w*>)/.test(t))add(i,start,end,'A dictionary or custom node must contain named child nodes or definitions.','invalid-dictionary-child');
  if(/^\/\d+\|match>?$/.test(t)||/^\/[^\s]*\|match/.test(t)){
   if(!/^\/\d+\|match>$/.test(t)){add(i,start,end,'Match must end with /N|match>.','missing-closer');continue;}
   const frame=close(['match'],i,start,end);if(frame&&(+t.match(/^\/(\d+)/)[1]!==frame.cases||frame.cases<2||!frame.wildcard))add(i,start,end,'Match requires at least two cases, a wildcard and the correct case count.','match-count');continue;
  }
  if(/^(?:\|case\b|case\b)/.test(t)){const f=stack.at(-1);const match=t.match(/^(?:\|case\||case\s+)\s*(_|\(.*\))\s*:$/);if(f?.kind!=='match')add(i,start,end,'case must belong to a match.','unexpected-case');else if(match){f.cases++;if(match[1]==='_'){if(f.wildcard)add(i,start,end,'Match has multiple wildcard cases.','duplicate-case');f.wildcard=true;}else if(f.wildcard)add(i,start,end,'Wildcard case must be last.','case-order');}if(!match)add(i,start,end,'Case syntax: |case|(value): or |case|_:','invalid-case');else if(!t.startsWith('|case|'))add(i,start,end,'Case requires |case| before its input.','invalid-case');continue;}
  if(/^<match\s*\(/.test(t)){if(!/\)\s*:$/.test(t))add(i,start,end,'Match header must end with ):','missing-closer');else push('match',i,start,end,{cases:0,wildcard:false});continue;}
  if(/^<try:>?$/.test(t)){push('try',i,start,end);continue;}
  if(/^<throw\(/.test(t)){if(t.endsWith('/try>'))continue;if(/\):\s*$/.test(t)){push('throw',i,start,end);continue;}add(i,start,end,'Throw must end with /try>.','missing-closer');continue;}
  if(/^<catch\(|^catch\(/.test(t)){if(stack.at(-1)?.kind!=='try')add(i,start,end,'catch must belong to a try.','unexpected-catch');else if(!t.endsWith('/try>')&&!/\):\s*$/.test(t))add(i,start,end,'Malformed catch delimiter.','missing-closer');continue;}
  if(/^\/?\/?try$/.test(t)||t==='<\/try'){add(i,start,end,'Try is missing its final >.','missing-closer');continue;}
  if(t==='/try>'||t==='</try>'){close(['try','throw'],i,start,end);continue;}
  if(/^<def:/.test(t)){if(!/^<def:[A-Za-z_]\w*\s*\(.*\)>$/.test(t))add(i,start,end,'Invalid definition name or missing )>.','invalid-definition');else {if(parent?.kind==='data')parent.children.push({type:'def',line:i,start,end});push('def',i,start,end);}continue;}
  if(/^<[?%]>$/.test(t)){push('def',i,start,end);continue;}
  if(/^<(?:for|while|if)\|/.test(t)){if(!t.endsWith('>'))add(i,start,end,'Control node is missing its final >.','missing-closer');else push(/^<if\|/.test(t)?'if':'loop',i,start,end);continue;}
  if(/^<elif\||^<else\b/.test(t)){if(!t.endsWith('>'))add(i,start,end,'Branch is missing its final >.','missing-closer');if(stack.at(-1)?.kind!=='if')add(i,start,end,'Branch must belong to an if.','structure');continue;}
  if(/^<(?:import|from|use)\|/.test(t)){if(!t.endsWith(t.startsWith('<import|')?'/import>':'/use>'))add(i,start,end,'Module directive is missing its closing delimiter.','missing-closer');continue;}
  if(/^<print\(|^<input\(/.test(t)){if(!/\)\s*\/(?:p|ip)>$/.test(t))add(i,start,end,'Print/input is missing its closing delimiter.','missing-closer');continue;}
  if(t.startsWith('</')){if(!t.endsWith('>')){add(i,start,end,'Closing signature is missing >.','missing-closer');continue;}const sig=t.slice(2,-1);const kind=({d:['def'],loop:['loop'],if:['if']})[sig]||['data'];const f=close(kind,i,start,end);if(f&&f.kind==='data'){const shape=sig.replace(/^\$/,'').replace(/&immut$/,'').match(/^dict\[([^\]]+)\](?:\{([^}]+)\})?\((\$?)(\d+)\)$/);if(shape){const allowed=shape[1].split(',').map(v=>v.trim()),pos=shape[2]?.split(',').map(v=>v.trim())||[];for(const [idx,child] of f.children.entries()){const types=pos[idx]?[pos[idx]]:allowed;if(!types.includes('any')&&!types.includes(child.type)&&!((/^int\d*$/.test(child.type)&&types.includes('int'))||(/^float\d*$/.test(child.type)&&types.includes('float'))))add(i,start,end,`Dictionary child ${idx+1} (line ${child.line+1}) has signature ${child.type}; allowed: ${types.join(', ')}.`,'dictionary-type');}if(f.children.length>+shape[4]||(!shape[3]&&f.children.length<+shape[4]))add(i,start,end,`Dictionary has ${f.children.length} children but declares ${shape[4]}.`,shape[3]?'forced-length':'dictionary-length',shape[3]?'error':'warning');}else if(f.children.length&&sig&&!/^\$?node(?:&immut)?$/.test(sig))add(i,start,end,'A scalar node cannot contain named child nodes.','invalid-container');const outer=stack.at(-1);if(outer?.kind==='data')outer.children.push({type:sig.replace(/^\$/,'').replace(/&immut$/,'').split(/[\[(]/)[0],line:f.line,start:f.start,end:f.end});}if(f&&!sig)add(i,start,end,'Data node has no signature.','unsigned-node','warning');continue;}
  if(t.startsWith('<')){
   const m=t.match(/^<([^<>]*)>/);if(!m){add(i,start,end,'Node opening delimiter is missing >.','missing-closer');continue;}const name=m[1];if(!/^\$?[A-Za-z_]\w*$/.test(name))add(i,start,start+m[0].length,name?'Invalid data node name.':'Every data node must have a name.','invalid-name');
   const tail=t.slice(m[0].length);if(!tail.trim()){ // Masked quoted body can look empty; a later closer is still mandatory.
    push('data',i,start,start+m[0].length,{children:[]});continue;
   }
   const k=t.lastIndexOf('</');if(k<0||!t.endsWith('>')){add(i,start,end,'Data node is missing </signature>.','missing-closer');continue;}
   const sig=t.slice(k+2,-1);if(t.includes('<input(')&&!t.slice(0,k).includes('/ip>'))add(i,start,end,'Nested input is missing /ip>.','missing-closer');if(sig==='&immut')add(i,start+k,end,'&immut requires a data signature.','invalid-signature');if(!sig.trim())add(i,start+k,end,'Data node has no signature.','unsigned-node','warning');
   if(sig.includes('<')||sig.includes('>'))add(i,start+k,end,'Malformed closing signature.','structure');
   const base=sig.replace(/^\$/,'').replace(/&immut$/,'').split(/[\[(]/)[0];if(base==='dict')add(i,start,end,'Dictionary declarations require named multiline child nodes.','invalid-dictionary');if(parent?.kind==='data')parent.children.push({type:base,line:i,start,end});continue;
  }
  // Standalone statements must be a recognized control word, call, modification, or a throw payload.
  if(stack.at(-1)?.kind==='throw'&&raw.trim().startsWith('|'))continue;
  if(/^pass(?:\(\))?$/.test(t))continue;
  if(/^(?:[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*)(?:[%?][A-Za-z_]\w*)?\s*\(.*\)$/.test(t))continue;
  add(i,start,end,'Unexpected text: expected a named node, valid function call, or NCS statement.','stray-text');
 }
 for(const f of stack)add(f.line,f.start,f.end,`Unclosed ${f.kind==='data'?'data node':f.kind+' block'}.`,'unclosed-node');
 for(const s of spans(text)){if(s.closed||s.kind==='comment'&&text.startsWith('!<--',s.start))continue;const before=text.slice(0,s.start),line=before.split('\n').length-1,start=s.start-(before.lastIndexOf('\n')+1);add(line,start,start+Math.min(3,s.end-s.start),'Unclosed '+(s.kind==='doc'?'documentation comment':s.kind)+'.','unclosed-literal');}
 return out;
}
module.exports={check};
