# AURA Windows desktop-style launcher. Windows/ Soloist audio remains untested.
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$port = $null
foreach ($candidate in @(4373,4374)) {
  try {
    $response=Invoke-WebRequest -Uri "http://127.0.0.1:$candidate/api/bootstrap" -UseBasicParsing -TimeoutSec 2
    if($response.StatusCode -eq 200){$port=$candidate;break}
  }catch{}
}
if(-not $port){
  $node=Get-Command node -ErrorAction SilentlyContinue
  if(-not $node){throw 'Node.js is required for AURA.'}
  $logDir=Join-Path $env:USERPROFILE '.aura-music'
  New-Item -ItemType Directory -Force -Path $logDir | Out-Null
  $process=Start-Process -FilePath $node.Source -ArgumentList 'server.mjs' -WorkingDirectory $root -WindowStyle Hidden -PassThru
  for($i=0;$i -lt 40;$i++){
    try {
      $response=Invoke-WebRequest -Uri 'http://127.0.0.1:4373/api/bootstrap' -UseBasicParsing -TimeoutSec 1
      if($response.StatusCode -eq 200){$port=4373;break}
    }catch{}
    Start-Sleep -Milliseconds 250
  }
}
if(-not $port){throw 'AURA local backend did not become ready.'}
$programs=@(
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
)
$browser=$programs | Where-Object {$_ -and (Test-Path $_)} | Select-Object -First 1
if(-not $browser){throw 'Install Chrome or Edge, or open the AURA loopback URL in your browser.'}
Start-Process -FilePath $browser -ArgumentList "--app=http://127.0.0.1:$port/"
