#!/usr/bin/env bash
set -euo pipefail
SOURCE="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
EXTENSIONS="${1:-$HOME/.vscode/extensions}"
python3 - "$SOURCE" "$EXTENSIONS" <<'PY'
import json, shutil, sys, datetime, tempfile
from pathlib import Path
source=Path(sys.argv[1]).resolve(); root=Path(sys.argv[2]).expanduser().resolve()
root.mkdir(parents=True,exist_ok=True)
pkg=json.loads((source/'package.json').read_text())
identity=(pkg['publisher'],pkg['name'])
target=root/f'{identity[0]}.{identity[1]}-{pkg["version"]}'
if source==target or root in source.parents: raise SystemExit('Run the installer from the extracted download, not the installed extension.')
backup=root.parent/'ncs-extension-backups'/datetime.datetime.now().strftime('%Y%m%d-%H%M%S-%f')
old=[]
for folder in sorted(root.iterdir()):
    if not folder.is_dir() or folder.is_symlink(): continue
    try: manifest=json.loads((folder/'package.json').read_text())
    except (ValueError,OSError): continue
    if (manifest.get('publisher'),manifest.get('name'))==identity:
        old.append((folder,manifest))
if target.exists() and not any(folder==target for folder,_ in old):
    raise SystemExit(f'Refusing to overwrite unrecognized directory: {target}')
# Prepare new extension first. Carry forward the optional installed icon assets and contributions.
def version(item):
    return tuple(int(n) for n in item[1].get('version','0').split('.') if n.isdigit())
with tempfile.TemporaryDirectory(prefix='.ncs-install-',dir=root) as staging:
    stage=Path(staging)/'extension';shutil.copytree(source,stage)
    for folder,manifest in sorted(old,key=version,reverse=True):
        if not (folder/'icons').is_dir(): continue
        shutil.copytree(folder/'icons',stage/'icons',dirs_exist_ok=True)
        def valid_asset(asset):
            if not isinstance(asset,str):return False
            file=(stage/asset).resolve()
            return file.is_relative_to(stage/'icons') and file.is_file()
        if valid_asset(manifest.get('icon')):pkg['icon']=manifest['icon']
        langs=pkg['contributes']['languages']
        for prev in manifest.get('contributes',{}).get('languages',[]):
            if prev.get('id') not in ('ncs','ncs-compiled'):continue
            icon=prev.get('icon',{})
            if not isinstance(icon,dict) or not all(valid_asset(icon.get(key)) for key in ('light','dark')):continue
            dest=next((x for x in langs if x.get('id')==prev['id']),None)
            if dest is None:
                dest={key:prev[key] for key in ('id','aliases','extensions') if key in prev};langs.append(dest)
            dest['icon']=icon
        print('Preserved installed icon assets from:',folder)
        break
    (stage/'package.json').write_text(json.dumps(pkg,indent=2,ensure_ascii=False)+'\n')
    moved=[]
    try:
        for folder,_ in old:
            backup.mkdir(parents=True,exist_ok=True)
            dest=backup/folder.name;shutil.move(str(folder),str(dest));moved.append((folder,dest));print('Backed up:',folder)
        stage.rename(target)
    except BaseException:
        for folder,dest in reversed(moved):
            if not folder.exists() and dest.exists():shutil.move(str(dest),str(folder))
        raise
print('Installed:',target)
print('Reload VS Code, then run NCS: Enable Dark 2026 Support from the Command Palette.')
PY
