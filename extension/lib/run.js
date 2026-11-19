// NCS interpretation uses VS Code's process tasks, never shell interpolation.
const vscode = require('vscode');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const compiled = 'ncs.compiledInterpreter';
const isNcs = uri => /\.ncs(?:\.compile)?$/i.test(uri.fsPath);
function executable() {
  const configured = vscode.workspace.getConfiguration('ncs').get('interpreterExecutable', '').trim();
  if (configured) return configured;
  const defaults = process.platform === 'win32'
    ? [path.join(process.env.ProgramFiles || 'C:\\Program Files', 'NCS', 'ncs.exe'), path.join(process.env.ProgramW6432 || 'C:\\Program Files', 'NCS', 'ncs.exe')]
    : ['/usr/bin/ncs', '/usr/local/bin/ncs'];
  return defaults.find(p => fs.existsSync(p)) || (process.platform === 'win32' ? 'ncs.exe' : 'ncs');
}
async function runUri(uri) {
  if (!uri || !isNcs(uri) || uri.scheme !== 'file') {
    vscode.window.showWarningMessage('NCS: open a local saved .ncs or .ncs.compile file first.'); return;
  }
  if (!vscode.workspace.isTrusted) {
    vscode.window.showWarningMessage('NCS execution is disabled in Restricted Mode. Trust the workspace only if you trust its code.'); return;
  }
  const doc = vscode.workspace.textDocuments.find(d => d.uri.toString() === uri.toString());
  if (doc?.isDirty && !(await doc.save())) return;
  const folder = vscode.workspace.getWorkspaceFolder(uri);
  if (!folder && !vscode.workspace.workspaceFolders?.length) {
    try { const terminal = vscode.window.createTerminal({name:'NCS: '+path.basename(uri.fsPath),shellPath:executable(),shellArgs:['interpret',uri.fsPath],cwd:path.dirname(uri.fsPath)}); terminal.show(); }
    catch (e) { vscode.window.showErrorMessage('NCS: could not start interpreter. '+e.message); }
    return;
  }
  const task = new vscode.Task({type:'ncs', file:uri.fsPath}, folder || vscode.TaskScope.Workspace,
    'Interpret ' + path.basename(uri.fsPath), 'NCS',
    new vscode.ProcessExecution(executable(), ['interpret', uri.fsPath], {cwd:path.dirname(uri.fsPath)}), []);
  task.presentationOptions = {reveal:vscode.TaskRevealKind.Always, focus:true, panel:vscode.TaskPanelKind.Dedicated, clear:false};
  try { await vscode.tasks.executeTask(task); }
  catch (e) { vscode.window.showErrorMessage('NCS: could not start interpreter. Install NCS or set ncs.interpreterExecutable. ' + e.message); }
}
function register(context) {
  context.subscriptions.push(vscode.commands.registerCommand('ncs.runFile', async uri => {
    if (!(uri instanceof vscode.Uri)) uri = vscode.window.activeTextEditor?.document.uri;
    if (!uri) { vscode.window.showWarningMessage('NCS: select a source file or use Run again in the compiled-file editor.'); return; }
    await runUri(uri);
  }));
  context.subscriptions.push(vscode.window.registerCustomEditorProvider(compiled, {
    openCustomDocument(uri) { return {uri, dispose(){}}; },
    async resolveCustomEditor(document, panel) {
      const nonce = crypto.randomBytes(18).toString('base64');
      const trusted = vscode.workspace.isTrusted;
      const autorun = vscode.workspace.getConfiguration('ncs', document.uri).get('autoRunCompiled', true);
      panel.webview.options = {enableScripts:true, localResourceRoots:[]};
      panel.webview.html = `<!doctype html><html><head><meta charset="UTF-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'"><title>NCS compiled program</title></head><body><h2>NCS compiled program</h2><p>This file contains portable binary code, not editable text.</p><p>${!trusted ? 'Execution is blocked in Restricted Mode.' : autorun ? 'Opening this file starts the interpreter in the task terminal.' : 'Automatic interpretation is disabled.'}</p><button id="run">Run again</button><script nonce="${nonce}">const vscode=acquireVsCodeApi();document.getElementById('run').onclick=()=>vscode.postMessage('run');</script></body></html>`;
      const subscription = panel.webview.onDidReceiveMessage(message => { if (message === 'run') void runUri(document.uri); });
      panel.onDidDispose(() => subscription.dispose());
      if (trusted && autorun) await runUri(document.uri);
    }
  }, {supportsMultipleEditorsPerDocument:false, webviewOptions:{retainContextWhenHidden:true}}));
}
module.exports = {register};
