// Shared comment boundaries for highlighting, source checks, and editor context.
// A prose apostrophe is not a string opener. Only complete quoted spans can
// protect a closing brace inside an inline comment.
const inlinePattern = String.raw`!\{(?:"(?:\\.|[^"\\\r\n])*"|(?<![\p{L}\p{N}_])'(?:\\.|[^'\\\r\n])*'|[^}\r\n])*(?:\}|(?=\r?$))`;
const inline = new RegExp(inlinePattern, 'muy');
function lineEnd(text, start) { const next = text.indexOf('\n', start); return next < 0 ? text.length : next; }
function commentAt(text, start) {
  if (text.startsWith('!<--', start)) return {end:lineEnd(text,start), kind:'comment', closed:false};
  if (text.startsWith('!{', start)) {
    inline.lastIndex=start;
    const hit=inline.exec(text);
    // The pattern stops at the first unquoted brace, or at the line ending.
    const end=hit?start+hit[0].length:lineEnd(text,start);
    return {end,kind:'comment',closed:text[end-1]==='}'};
  }
  if (text.startsWith('"""', start)) {
    const close=text.indexOf('"""',start+3);
    return {end:close<0?text.length:close+3,kind:'doc',closed:close>=0};
  }
  return null;
}
function literalAt(text,start){
  const q=text[start];if(q!=='"'&&q!=="'")return null;
  let i=start+1;
  while(i<text.length&&text[i]!=='\n'&&text[i]!=='\r'){
    if(text[i]==='\\'&&i+1<text.length&&text[i+1]!=='\n'){i+=2;continue;}
    if(text[i++]===q)return {end:i,kind:'string',closed:true};
  }
  return {end:i,kind:'string',closed:false};
}
function spans(text){const out=[];for(let i=0;i<text.length;){const span=commentAt(text,i)||literalAt(text,i);if(span){out.push({...span,start:i});i=span.end;}else i++;}return out;}
function mask(text,includeStrings=true){let start=0,out='';for(const s of spans(text)){if(!includeStrings&&s.kind==='string')continue;out+=text.slice(start,s.start)+text.slice(s.start,s.end).replace(/[^\r\n]/g,' ');start=s.end;}return out+text.slice(start);}
function inLiteralOrComment(text){const s=spans(text).at(-1);return !!s&&s.end===text.length&&!s.closed;}
module.exports={inlinePattern,commentAt,literalAt,spans,mask,inLiteralOrComment};
