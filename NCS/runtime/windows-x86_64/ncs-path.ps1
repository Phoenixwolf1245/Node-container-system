# Only edits the machine PATH for the exact managed install directory.
param([Parameter(Mandatory=$true)][ValidateSet('Install','Remove')][string]$Action)
$ErrorActionPreference = 'Stop'
$reg=[Microsoft.Win32.Registry]::LocalMachine.OpenSubKey('SYSTEM\CurrentControlSet\Control\Session Manager\Environment',$true)
$key=[Microsoft.Win32.Registry]::LocalMachine.CreateSubKey('SOFTWARE\Phoenixwolf1245\NCS')
try {
  $install=[IO.Path]::GetFullPath($PSScriptRoot).TrimEnd('\')
  $expected=[IO.Path]::Combine($env:ProgramFiles,'NCS')
  if (-not [string]::Equals($install,$expected,[StringComparison]::OrdinalIgnoreCase)) { throw 'Refusing a nonstandard installation location.' }
  $raw=[string]$reg.GetValue('Path','',[Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames)
  try {$kind=$reg.GetValueKind('Path')} catch {$kind=[Microsoft.Win32.RegistryValueKind]::ExpandString}
  function Same-Entry([string]$entry) {
    [string]::Equals($entry.Trim().Trim('"').TrimEnd('\'),$install,[StringComparison]::OrdinalIgnoreCase)
  }
  $parts=@($raw.Split(';'))
  if ($Action -eq 'Install') {
    if (-not ($parts | Where-Object { Same-Entry $_ })) {
      $new = if ($raw -eq '') {$install} elseif ($raw.EndsWith(';')) {$raw+$install} else {$raw+';'+$install}
      $reg.SetValue('Path',$new,$kind)
      $key.SetValue('PathAdded',1,[Microsoft.Win32.RegistryValueKind]::DWord)
    }
  } elseif ($key.GetValue('PathAdded',0) -eq 1) {
    # Remove only the last matching entry (the one appended by setup).
    $index=-1
    for ($i=0; $i -lt $parts.Count; $i++) { if (Same-Entry $parts[$i]) {$index=$i} }
    if ($index -ge 0) {
      $remaining=for($i=0; $i -lt $parts.Count; $i++){ if($i -ne $index){$parts[$i]} }
      $reg.SetValue('Path',($remaining -join ';'),$kind)
    }
    $key.DeleteValue('PathAdded',$false)
  }
} finally { $key.Dispose(); $reg.Dispose() }
