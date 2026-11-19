// NCS editor assistance. No native runtime or network services are required.
const vscode = require('vscode');
const ctx = require('./context');
const builtins = require('./builtins');
const menus = require('./menus');
const diagnostics = require('./diagnostics');
const editorSupport=require('./lib/editor');
const navigation=require('./lib/navigation');

const {inLiteralOrComment}=require('./lib/comment-boundaries');
function activate(context) {
  editorSupport.register(context);
  require("./lib/media").register(context);
  require("./lib/inline-preview").register(context);
  context.subscriptions.push(vscode.commands.registerTextEditorCommand('ncs.wrapSelectionInNode', async (editor, edit) => {
    const name = await vscode.window.showInputBox({ prompt: 'NCS node name', value: 'value', validateInput: v => /^[A-Za-z_][A-Za-z0-9_]*$/.test(v) ? undefined : 'Use a valid NCS node name' });
    if (!name) return;
    const signature = await vscode.window.showQuickPick(['str','abc','int','float','bool','binary','list[str](1)','dict[str](1)'], {placeHolder: 'Select signature'});
    if (!signature) return;
    const selection=editor.selection;
    const selected=editor.document.getText(selection);
    await editor.edit(e => e.replace(selection, `<${name}>${selected}</${signature}>`));
  }));
  context.subscriptions.push(vscode.commands.registerTextEditorCommand('ncs.insertClosingSignature', async editor => {
    const signature = await vscode.window.showQuickPick(['str','abc','int','float','bool','binary','list[str](0)','dict[str](0)','d','loop','if','/try'], {placeHolder: 'Choose NCS closing signature'});
    if (!signature) return;
    const closer = signature === '/try' ? '/try>' : `</${signature}>`;
    await editor.edit(e => e.insert(editor.selection.active,closer));
  }));
  const selector={language:'ncs'};
  const builtinDocs=d=>{const m=new vscode.MarkdownString();m.appendMarkdown('**'+d.name+'**'+(d.planned?' — Planned':'')+'\n\n');m.appendText(d.definition);m.appendMarkdown('\n\n');m.appendText(d.detail);m.appendMarkdown('\n\n**Example**\n');m.appendCodeblock(d.example,'ncs');return m;};
  // Replace the triggering character and an optional auto-inserted closing angle bracket.
  context.subscriptions.push(vscode.languages.registerCompletionItemProvider(selector,{
    provideCompletionItems(document,position){
      const line=document.lineAt(position.line).text, before=line.slice(0,position.character), after=line.slice(position.character);
      const trigger=before.slice(-1);if(!['<','>','!','|'].includes(trigger))return;
      const start=position.character-1;
      // Avoid completing within a comment or quoted literal. A standalone > is accepted as a convenience.
      const prefix=document.getText().slice(0,document.offsetAt(position)-1);
      const prefixLine=before.slice(0,-1);
      if((trigger==='>'||trigger==='|')&&prefixLine.trim()!=='')return;
      if(trigger==='<'&&/[</]$/.test(prefixLine))return;
      const masked=ctx.mask(prefix+'X');if(masked.endsWith(' ')||masked.split('\n').pop()?.trimEnd().endsWith('!'))return;
      // Determine whether this position is in an unterminated quote or existing comment.
      if(inLiteralOrComment(prefix))return;
      const entries=trigger==='!'?menus.comments:trigger==='|'?menus.nodes.filter(([label])=>label==='Case'||label==='Default case'):editorSupport.catalog(document).nodes;
      const end=position.character+(trigger==='<'&&after.startsWith('>')?1:0);
      return entries.map(([label,template,detail],i)=>{
        const item=new vscode.CompletionItem(label,vscode.CompletionItemKind.Snippet);
        item.detail=detail;item.insertText=new vscode.SnippetString(template);
        item.range=new vscode.Range(position.line,start,position.line,end);item.filterText=trigger+label;item.sortText=String(i).padStart(3,'0');return item;
      });
    }
  },'<','>','!','|'));
  const collection=vscode.languages.createDiagnosticCollection('ncs');context.subscriptions.push(collection);
  const timers=new Map();
  function refresh(document){if(document.languageId!=='ncs')return;const key=document.uri.toString();clearTimeout(timers.get(key));timers.set(key,setTimeout(()=>{timers.delete(key);if(document.isClosed||!vscode.workspace.getConfiguration('ncs',document.uri).get('diagnostics.enabled',true)){collection.delete(document.uri);return;}
    const items=diagnostics.analyse(document.getText(),editorSupport.catalog(document).signatures).map(d=>{const length=document.lineAt(d.line).text.length;const range=new vscode.Range(d.line,Math.min(d.start,length),d.line,Math.min(d.end,length));const diag=new vscode.Diagnostic(range,d.message,d.severity==='warning'?vscode.DiagnosticSeverity.Warning:vscode.DiagnosticSeverity.Error);diag.source='NCS (source check)';diag.code=d.code;return diag;});collection.set(document.uri,items);},180));}
  context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(refresh),vscode.workspace.onDidChangeTextDocument(e=>refresh(e.document)),vscode.workspace.onDidCloseTextDocument(d=>{clearTimeout(timers.get(d.uri.toString()));timers.delete(d.uri.toString());collection.delete(d.uri);}),vscode.workspace.onDidChangeConfiguration(e=>{if(e.affectsConfiguration('ncs.diagnostics.enabled'))vscode.workspace.textDocuments.forEach(refresh);}),{dispose(){for(const timer of timers.values())clearTimeout(timer);}});
  const catalogWatcher=vscode.workspace.createFileSystemWatcher('**/.ncs/nodes/*.{json,ncs}');
  const catalogRefresh=()=>vscode.workspace.textDocuments.forEach(refresh);
  context.subscriptions.push(catalogWatcher,catalogWatcher.onDidCreate(catalogRefresh),catalogWatcher.onDidChange(catalogRefresh),catalogWatcher.onDidDelete(catalogRefresh));
  vscode.workspace.textDocuments.forEach(refresh);
  const label=d=>`${d.qualified}(${d.params.map(p=>p.raw).join(', ')})`;
  function docs(d,full=true){
    const m=new vscode.MarkdownString();m.appendCodeblock(label(d),'ncs');
    if(d.summary)m.appendText(d.summary);
    if(full&&d.documentation){m.appendMarkdown('\n\n'+d.documentation);}
    return m;
  }
  context.subscriptions.push(vscode.languages.registerCompletionItemProvider(selector,{
    provideCompletionItems(document,position){
      const text=document.getText(), defs=ctx.definitions(text), call=ctx.callAt(text,document.offsetAt(position));
      const items=defs.map(d=>{
        const item=new vscode.CompletionItem(d.qualified,vscode.CompletionItemKind.Function);
        item.detail=d.summary||label(d);item.documentation=docs(d,false);
        item.insertText=new vscode.SnippetString().appendText(d.qualified+'(');
        d.params.forEach((p,i)=>{if(i)item.insertText.appendText(', ');item.insertText.appendPlaceholder(p.name,i+1);});
        item.insertText.appendText(')');return item;
      });
      for(const sym of navigation.symbols(text).filter(s=>s.kind==='node')){const item=new vscode.CompletionItem(sym.name,vscode.CompletionItemKind.Variable);item.detail='NCS node';items.push(item);}
      const before=document.lineAt(position.line).text.slice(0,position.character);
      if(!inLiteralOrComment(text.slice(0,document.offsetAt(position)))){
        const catalog=editorSupport.catalog(document);
        if(/<\/\$?[A-Za-z_0-9]*$/.test(before)){for(const t of catalog.signatures){const item=new vscode.CompletionItem(t,vscode.CompletionItemKind.Variable);item.detail='NCS signature';items.push(item);}}
        else {for(const [name,b] of Object.entries(catalog.docs)){if(b.planned)continue;const item=new vscode.CompletionItem(name,vscode.CompletionItemKind.Function);item.detail=b.definition;item.documentation=builtinDocs(b);items.push(item);}}
      }
      const d=call&&ctx.findDefinition(defs,call.name);
      if(d)for(const p of d.params){const item=new vscode.CompletionItem(p.name,vscode.CompletionItemKind.Variable);item.detail=p.type||'Any signature';item.documentation=p.description;items.push(item);}
      return items;
    }
  },'=', '(', ',', '|','.','/','%'));
  context.subscriptions.push(vscode.languages.registerHoverProvider(selector,{
    provideHover(document,position){
      const range=document.getWordRangeAtPosition(position,/[A-Za-z_][A-Za-z0-9_.]*(?:\?exists)?/);
      if(!range)return;const name=document.getText(range);const symbol=navigation.candidates(document.getText(),name,document.offsetAt(position))[0];
      if(symbol){const m=symbol.definition?docs({...symbol.definition,qualified:symbol.qualified}):new vscode.MarkdownString();if(!symbol.definition){m.appendCodeblock(symbol.qualified,'ncs');m.appendText(symbol.detail);if(symbol.documentation)m.appendMarkdown('\n\n'+symbol.documentation);}if(symbol.unique){m.appendMarkdown('\n\n**Unique node: first binding only; direct copying is prohibited.**');}if(symbol.locked){m.appendMarkdown('\n\n**<span style="color:#F44747">This is a forced-signature node.</span>**');m.supportHtml=true;}if(symbol.immutable&&!symbol.locked){m.appendMarkdown('\n\n**<span style="color:#F44747">This is an immutable node.</span>**');m.supportHtml=true;}return new vscode.Hover(m,range);}
      const builtin=editorSupport.catalog(document).docs[name];if(builtin)return new vscode.Hover(builtinDocs(builtin),range);
    }
  }));
  context.subscriptions.push(vscode.languages.registerSignatureHelpProvider(selector,{
    provideSignatureHelp(document,position){
      const text=document.getText(),call=ctx.callAt(text,document.offsetAt(position));if(!call)return;
      const d=ctx.findDefinition(ctx.definitions(text),call.name);if(!d)return;
      const signature=new vscode.SignatureInformation(label(d),docs(d));
      signature.parameters=d.params.map(p=>new vscode.ParameterInformation(p.raw,p.description||p.type||'Any signature'));
      const help=new vscode.SignatureHelp();help.signatures=[signature];help.activeSignature=0;
      const named=call.args[call.index]?.match(/=\s*([A-Za-z_][A-Za-z0-9_]*)\s*$/);
      const index=named?d.params.findIndex(p=>p.name===named[1]):-1;
      help.activeParameter=Math.max(0,Math.min(d.params.length-1,index>=0?index:call.index));return help;
    }
  },'(', ',', '|', '='));

}
function deactivate() {}
module.exports={activate,deactivate};
