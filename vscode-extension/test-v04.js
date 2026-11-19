const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),os=require('node:os');
const {load}=require('./lib/catalog'),{tokenize,palette}=require('./lib/highlight'),{symbols,candidates}=require('./lib/navigation'),{analyse}=require('./diagnostics');
const cat=load([path.join(__dirname,'nodes')]);assert.equal(cat.errors.length,0);for(const name of ['import','use','from']){assert.ok(cat.docs[name].planned);assert.ok(cat.nodes.some(x=>x[0].toLowerCase().startsWith(name)));}
const source=`!<-- green
\t!{a comment with "quotes"}
"""Orange docs
!<-- doc remains orange"""
<greeting>"Hello World!"</str>
<locked>42</$int>
<def:f(name:[int,float],age:str!{documentation})>
    greeting%replace("x")
    <print(f"Hello {name} {sys.time.clock()}!")/p>
    a&b?size()
</d>
<import|library.ncs/import>
<print(locked)/p>`;
const tokens=tokenize(source,cat);function tokenAt(line,word,kind,shift=0){const lines=source.split('\n');const idx=lines.slice(0,line).reduce((a,l)=>a+l.length+1,0)+lines[line].indexOf(word)+shift;const token=tokens.find(t=>idx>=t.start&&idx<t.end);assert.equal(token?.kind,kind,`${line}: ${word}`);}
tokenAt(0,'green','comment');tokenAt(1,'quotes','comment');tokenAt(3,'doc remains','doc');tokenAt(4,'greeting','node');tokenAt(4,'"Hello','string');tokenAt(4,'str','signature');tokenAt(5,'$','yellow');tokenAt(6,'f(','call');tokenAt(6,'int','signature');tokenAt(6,'float','signature');tokenAt(6,'str','signature');tokenAt(6,'documentation','comment');tokenAt(7,'%','yellow');tokenAt(7,'replace','call');tokenAt(8,'print','mode');tokenAt(8,'f"Hello','fstring');tokenAt(8,'{name}','yellow');tokenAt(8,'name','variable');tokenAt(8,'sys.time.clock','call');tokenAt(9,'&','yellow');tokenAt(9,'?','yellow');tokenAt(11,'import','mode');tokenAt(11,'/import','delimiter');tokenAt(11,'/import','signature',1);
assert.equal(palette.node,'#569CD6');assert.equal(palette.variable,'#FFFFFF');assert.equal(palette.comment,'#6A9955');
assert.ok(analyse(source).some(x=>x.code==='forced-print'));assert.ok(symbols(source).some(x=>x.name==='greeting'));assert.ok(symbols(source).some(x=>x.name==='f'));assert.equal(candidates(source,'greeting',source.indexOf('greeting%'))[0].name,'greeting');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'ncs-editor-'));try{fs.writeFileSync(path.join(temp,'color.json'),JSON.stringify({name:'color',signature:true,definition:'Color',template:'<${1:mode}></color>',planned:true}));fs.writeFileSync(path.join(temp,'bad.json'),'{');const custom=load([temp]);assert.equal(custom.errors.length,1);assert.ok(custom.signatures.has('color'));assert.ok(custom.nodes.some(x=>x[0]==='color'));assert.ok(!analyse('<color>"#ffffff"</color>',custom.signatures).some(x=>x.code==='invalid-signature'));assert.equal(tokenize('<color>"x"</color>',custom).at(-2).kind,'signature');}finally{fs.rmSync(temp,{recursive:true,force:true});}
console.log('v0.4 lexer, modular catalog, navigation, diagnostics tests passed');
// Verify actual editor decoration application with a minimal editor mock.
const Module=require('node:module');const regs=[],applied=[];const noop=()=>({dispose(){}});const doc={languageId:'ncs',uri:{toString:()=> 'file:preview.ncs'},getText:()=>source,positionAt:x=>({offset:x})};const fakeEditor={document:doc,setDecorations:(kind,ranges)=>applied.push({color:kind.color,ranges})};const fakeVS={Range:class{constructor(a,b){this.start=a;this.end=b;}},DecorationRangeBehavior:{ClosedClosed:1},StatusBarAlignment:{Right:1},window:{visibleTextEditors:[fakeEditor],activeTextEditor:fakeEditor,createTextEditorDecorationType:opt=>({...noop(),color:opt.color}),onDidChangeVisibleTextEditors:noop,onDidChangeActiveTextEditor:noop,createStatusBarItem:()=>({...noop(),show(){},hide(){}})},commands:{registerCommand:noop},languages:{registerDocumentSymbolProvider:noop,registerReferenceProvider:noop,registerDefinitionProvider:noop},workspace:{getConfiguration:()=>({get:(_,d)=>d}),onDidChangeTextDocument:noop,onDidChangeConfiguration:noop,createFileSystemWatcher:()=>({...noop(),onDidCreate:noop,onDidChange:noop,onDidDelete:noop})}};const prev=Module._load;Module._load=function(id,...args){return id==='vscode'?fakeVS:prev.call(this,id,...args);};require('./lib/editor').register({subscriptions:regs});Module._load=prev;
for(const [kind,word] of [['comment','green'],['node','greeting'],['string','Hello World!'],['signature','str'],['yellow','%'],['fstring','f"Hello'],['mode','print']]){const idx=source.indexOf(word);assert.ok(applied.some(x=>x.color===palette[kind]&&x.ranges.some(r=>r.start.offset<=idx&&r.end.offset>idx)),`actual decoration: ${kind} ${word}`);}
assert.ok(analyse('<locked>1</$int>\nlocked%add(1)').some(d=>d.code==='forced-write'&&d.end>7));assert.ok(analyse('counter%').some(d=>d.code==='incomplete-operator'));
console.log('v0.4 actual provider decoration calls and operator diagnostics passed');
