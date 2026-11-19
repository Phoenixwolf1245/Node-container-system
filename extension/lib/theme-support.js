// NCS-only color rules for VS Code themes; never override the general palette.
const {palette}=require('./highlight');
const dark=require('../themes/ncs-dark.json');
const DEFAULT_THEME='Dark 2026';
const semanticRules=Object.fromEntries(Object.entries(palette).map(([kind,color])=>[`ncs${kind[0].toUpperCase()+kind.slice(1)}:ncs`,{foreground:color,bold:false,italic:false,underline:false,strikethrough:false}]));
const textMateRules=dark.tokenColors.map(rule=>({scope:(Array.isArray(rule.scope)?rule.scope:[rule.scope]).filter(s=>s.endsWith('.ncs')).map(s=>s.startsWith('source.ncs ')?s:'source.ncs '+s),settings:{...rule.settings,fontStyle:''}})).filter(rule=>rule.scope.length);
function mergeSemantic(existing,theme){const key=`[${theme}]`;const old=existing||{};const group=old[key]||{};return {...old,[key]:{...group,rules:{...group.rules,...semanticRules}}};}
function mergeTextMate(existing,theme){const key=`[${theme}]`;const old=existing||{};const group=old[key]||{};const ours=new Set(textMateRules.map(r=>JSON.stringify(r.scope)));return {...old,[key]:{...group,textMateRules:[...(group.textMateRules||[]).filter(r=>!ours.has(JSON.stringify(r.scope))),...textMateRules]}};}
async function apply(vscode,theme){
 const editor=vscode.workspace.getConfiguration('editor');const target=vscode.ConfigurationTarget.Global;
 // Read raw user values so workspace or extension defaults are not copied into user settings.
 const sem=editor.inspect('semanticTokenColorCustomizations')?.globalValue;
 const tm=editor.inspect('tokenColorCustomizations')?.globalValue;
 await editor.update('semanticTokenColorCustomizations',mergeSemantic(sem,theme),target);
 await editor.update('tokenColorCustomizations',mergeTextMate(tm,theme),target);
 const ncsEditor=vscode.workspace.getConfiguration('editor',{languageId:'ncs'});
 for(const [key,value] of Object.entries({'semanticHighlighting.enabled':true,'bracketPairColorization.enabled':false,'minimap.showRegionSectionHeaders':false,'minimap.showMarkSectionHeaders':false,'renderValidationDecorations':'on'}))await ncsEditor.update(key,value,target,true);
 await vscode.workspace.getConfiguration('ncs').update('colors.enforcePalette',true,target);
}
module.exports={DEFAULT_THEME,semanticRules,textMateRules,mergeSemantic,mergeTextMate,apply};
