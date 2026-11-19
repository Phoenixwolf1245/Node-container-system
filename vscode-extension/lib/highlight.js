const {commentAt}=require('./comment-boundaries');
// Offset-based lexer shared by the editor and tests. It never evaluates source.
const palette={node:'#569CD6',signature:'#A6E22E',control:'#C586C0',boolean:'#C586C0',call:'#569CD6',mode:'#E87859',string:'#CE9178',fstring:'#C586C0',comment:'#6A9955',doc:'#D19A66',yellow:'#F0E442',delimiter:'#808080',variable:'#FFFFFF',number:'#B5CEA8',invalid:'#FF6363'};
const modes=new Set('def if elif else for while with match case in try throw catch import from use'.split(' '));
function tokenize(text,catalog){const out=[];let i=0,parameterHeader=false,parameterType=false,alternatives=0;const id=/^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*/;const types=catalog.signatures;
 function emit(start,end,kind){if(end>start)out.push({start,end,kind});}
 function take(kind,n){emit(i,i+n,kind);i+=n;}
 function ident(){return text.slice(i).match(id)?.[0];}
 function isType(s){return types.has(s)||/^(?:[pn]?int\d+|float\d+|d|p|ip|loop|if|try|match|use|import|from)$/.test(s);}
 function quoted(q,kind){const start=i++;while(i<text.length){const c=text[i++];if(c==='\\'&&i<text.length){i++;continue;}if(c===q||c==='\n')break;}emit(start,i,kind);}
 function format(){let start=i;i+=2;while(i<text.length){const c=text[i];if(c==='\\'&&i+1<text.length){i+=2;continue;}if(c==='"'||c==='\n'){i++;emit(start,i,'fstring');return;}if(text.startsWith('{{',i)||text.startsWith('}}',i)){emit(start,i,'fstring');take('yellow',2);start=i;continue;}if(c==='{'){emit(start,i,'fstring');take('yellow',1);let depth=1;while(i<text.length&&depth&&text[i]!=='\n'){if(text[i]==='}'){take('yellow',1);depth--;if(!depth)break;}else if(text[i]==='{'){take('yellow',1);depth++;}else scan(true);}start=i;if(depth)return;continue;}i++;}emit(start,i,'fstring');}
 function comment(){const span=commentAt(text,i);if(!span)return false;take(span.kind,span.end-i);return true;}
 function closer(){take('delimiter',2);let sub=0;while(i<text.length&&text[i]!== '>'&&text[i]!=='\n'){if(comment())continue;if(text[i]==='"'||text[i]==="'"){quoted(text[i],'string');continue;}const w=ident();if(w){take(w==='immut'&&text[i-1]==='&'?'control':isType(w)?'signature':sub?'variable':'invalid',w.length);continue;}const c=text[i];if('[](){}%&$?,|:='.includes(c)){if(c==='(')sub++;if(c===')')sub=Math.max(0,sub-1);take('yellow',1);continue;}const n=text.slice(i).match(/^\d+/)?.[0];if(n){take('number',n.length);continue;}i++;}if(text[i]==='>')take('delimiter',1);}
 function scan(interpolation=false){const c=text[i];if(comment())return;if(text.startsWith('f"',i)){format();return;}if(c==='"'||c==="'"){quoted(c,'string');return;}
 if(text.startsWith('</',i)){closer();return;}
 const short=text.slice(i).match(/^\/(\d+\|)?(p|ip|try|match|use|import|from)>/);if(short){take('delimiter',1);if(short[1]){take('number',short[1].length-1);take('yellow',1);}take('signature',short[2].length);take('delimiter',1);return;}
 if(c==='<'){take('delimiter',1);if(text[i]==='$')take('yellow',1);const w=ident();if(w){const next=text[i+w.length];if(modes.has(w)&&/[|:(>]/.test(next||'')){if(w==='def')parameterHeader=true;take('mode',w.length);return;}if(next==='>'){take('node',w.length);take('delimiter',1);return;}}return;}
 if(c==='>'){parameterHeader=false;parameterType=false;alternatives=0;take('delimiter',1);return;}
 if('()[]{}%&$?,|:='.includes(c)){if(parameterHeader){if(c===':'&&text.slice(Math.max(0,i-3),i)!=='def')parameterType=true;if(c==='['&&parameterType)alternatives++;if(c===']'&&alternatives)alternatives--;if((c===','||c==='|')&&!alternatives)parameterType=false;}take('yellow',1);return;}
 const w=ident();if(w){const rest=text.slice(i+w.length), call=/^\s*\(/.test(rest);let kind='variable';
 if(parameterHeader&&parameterType&&isType(w))kind='signature';else if(['in','range','continue','break','is','or','not','as','pass'].includes(w))kind='control';else if(['true','false'].includes(w))kind='boolean';else if(modes.has(w)&&!interpolation)kind='mode';else if(call){const prev=text[i-1];kind=interpolation||prev==='%'?'call':catalog.docs[w]?'mode':'call';}else if(/^[\s]*\?exists\s*\(/.test(rest)&&w==='sys.file')kind=interpolation?'call':'mode';else if(['exists','length','x','y','at'].includes(w)&&text[i-1]==='?')kind='mode';
 if(w.includes('.') && kind!=='signature'){const cut=w.lastIndexOf('.')+1;take('variable',cut);take(kind,w.length-cut);}else take(kind,w.length);return;}
 const number=text.slice(i).match(/^\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/);if(number){take('number',number[0].length);return;}i++;}
 while(i<text.length)scan();return out;
}
module.exports={palette,tokenize};
