const assert=require('node:assert/strict'),path=require('node:path');const high=require('./lib/highlight'),nav=require('./lib/navigation'),cat=require('./lib/catalog').load([path.join(__dirname,'nodes')]);const {analyse}=require('./diagnostics');const {mathValid}=require('./lib/expression-check');
const src=`<Dictionary>
"""Parent doc"""
 <Apple>
 """Apple doc"""
  <items>[1|2]</list[int](2)>
 </dict[any](1)>
 <def:Describe()>
  return("x")
 </d>
</dict[any](2)>
<def:Outer()>
 <def:Inner()>
  return("t")
 </d>
</d>
<locked>7</$int>
<print(locked)/p>
<print(list.length(items))/p>
<for|x|in|range(0|5)>
 continue()
 break()
</loop>
<def:add_one(value:int)>
 return(math(f"{value}+1+a"))
</d>
<answer>add_one(41+a)</int>`;
const symbols=nav.symbols(src);const item=symbols.find(x=>x.qualified==='Dictionary.Apple.items');assert.equal(item.parent.qualified,'Dictionary.Apple');assert.equal(nav.candidates(src,'Dictionary.Apple',src.length)[0].documentation,'Apple doc');assert.equal(nav.candidates(src,'Dictionary',src.length)[0].documentation,'Parent doc');assert.ok(symbols.find(x=>x.qualified==='Outer.Inner').parent);assert.equal(symbols.find(x=>x.name==='locked').locked,true);assert.equal(symbols.find(x=>x.name==='locked').type,'int');assert.equal(nav.candidates(src,'Wrong.items',src.length).length,0);
const tokens=high.tokenize(src,cat);const at=(word,delta=0)=>tokens.find(t=>t.start<=src.indexOf(word)+delta&&t.end>src.indexOf(word)+delta)?.kind;assert.equal(at('list.length'),'variable');assert.equal(at('list.length',5),'mode');assert.equal(at('range('),'control');assert.equal(at('continue()'),'control');assert.equal(at('break()'),'control');assert.equal(high.palette.signature,'#A6E22E');assert.equal(at('</$int>',3),'signature');const errs=analyse(src,cat.signatures);assert.ok(errs.some(x=>x.code==='invalid-math'));assert.ok(errs.some(x=>x.code==='invalid-argument'));assert.ok(errs.some(x=>x.code==='forced-print'));assert.ok(mathValid('sqrt(16)*4'));assert.ok(!mathValid('{x}+1+a'));assert.ok(cat.signatures.has('image'));assert.ok(cat.signatures.has('matrix3d'));
// Import pure media helpers with a mock vscode dependency.
const Module=require('node:module'),prev=Module._load;Module._load=function(id,...args){return id==='vscode'?{}:prev.call(this,id,...args);};const media=require('./lib/media');Module._load=prev;assert.deepEqual(media.colors('<t>"#FF000080"</color>')[0].rgba,[1,0,0,128/255]);assert.deepEqual(media.parseMatrix('[[1|2]|[3|4]]'),[['1','2'],['3','4']]);assert.equal(media.parseMatrix('[[1]|[2|3]]'),null);console.log('v0.5 hierarchy, exact hover, locked flag, palette, malformed math/arguments, color and matrix tests passed');
