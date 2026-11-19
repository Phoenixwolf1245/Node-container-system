# System-only NCS cleanup. Preview by default; run -Apply as administrator.
param([switch]$Apply)
$ErrorActionPreference='Stop'
$root=if($env:ProgramW6432){$env:ProgramW6432}else{$env:ProgramFiles}
$install=Join-Path $root 'NCS'
$marker=Join-Path $install '.ncs-managed-install'
$key='HKLM:\SOFTWARE\Phoenixwolf1245\NCS'
$identity='Phoenixwolf1245/Node-container-system managed runtime v1'
Write-Host 'NCS system-only cleanup. User profiles, home directories, projects, Wine prefixes and personal disks are not searched or removed.'
if(-not (Test-Path -LiteralPath $key)){Write-Host 'No registered machine-wide NCS installation found.';return}
$registered=(Get-ItemProperty -LiteralPath $key).InstallLocation
if(-not [string]::Equals($registered,$install,[StringComparison]::OrdinalIgnoreCase)){throw 'Registered location is not the expected Program Files installation. Left untouched.'}
if(-not (Test-Path -LiteralPath $marker -PathType Leaf)){throw 'Managed-install marker missing. Left untouched.'}
if((Get-Item -LiteralPath $install).Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Installation directory is a reparse point. Left untouched.'}
if((Get-Item -LiteralPath $marker).Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Marker is a reparse point. Left untouched.'}
if((Get-Content -LiteralPath $marker -Raw).Trim() -ne $identity){throw 'Unknown marker. Left untouched.'}
$uninstaller=Join-Path $install 'Uninstall.exe'
if(-not (Test-Path -LiteralPath $uninstaller -PathType Leaf)){throw 'Managed uninstaller missing; no recursive deletion attempted.'}
if((Get-Item -LiteralPath $uninstaller).Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Uninstaller is a reparse point. Left untouched.'}
Write-Host "Would uninstall only $install and its registered system integration."
if(-not $Apply){Write-Host 'Rerun from a 64-bit elevated PowerShell with -Apply.';return}
$principal=[Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
if(-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)){throw 'Administrator privileges are required for -Apply.'}
$result=Start-Process -FilePath $uninstaller -ArgumentList @('/S') -Wait -PassThru
if($result.ExitCode -ne 0){throw "Uninstaller returned $($result.ExitCode). Review its registered installation."}
