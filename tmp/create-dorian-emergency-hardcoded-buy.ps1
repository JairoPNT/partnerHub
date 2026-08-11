$ErrorActionPreference = "Stop"

$sourceDir = "D:\Proyectos multi agentes\PartnerHub\tmp\dorian-manual-fix"
$outDir = "D:\Proyectos multi agentes\PartnerHub\tmp\dorian-emergency-hardcoded-buy"
$zipPath = "D:\Proyectos multi agentes\PartnerHub\tmp\dorian-emergency-hardcoded-buy.zip"
$purchaseUrl = "https://col.ganoexcel.com/dorianwellness"

New-Item -ItemType Directory -Force -Path $outDir | Out-Null

Copy-Item -LiteralPath (Join-Path $sourceDir "app.js") -Destination (Join-Path $outDir "app.js") -Force
Copy-Item -LiteralPath (Join-Path $sourceDir "config.js") -Destination (Join-Path $outDir "config.js") -Force

$html = Get-Content -Raw -Encoding UTF8 -Path (Join-Path $sourceDir "index.html")

# Version de emergencia: dejar la URL real escrita en el HTML para no depender de JavaScript en la entrega.
$replacement = '<a href="' + $purchaseUrl + '" target="_blank" rel="noopener noreferrer" class="btn btn-primary product-btn-buy" aria-disabled="false"$1>'
$html = [regex]::Replace($html, '<a class="btn btn-primary product-btn-buy"(?: aria-disabled="true")?([^>]*)>', $replacement)

Set-Content -Path (Join-Path $outDir "index.html") -Value $html -Encoding UTF8

if (Test-Path $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}

Compress-Archive -Path (Join-Path $outDir "*") -DestinationPath $zipPath

Write-Host "Generated emergency hardcoded package:"
Get-ChildItem -Path $outDir | Select-Object Name, Length | Format-Table -AutoSize
Write-Host "Zip: $zipPath"
Write-Host "Verification:"
Select-String -Path (Join-Path $outDir "index.html") -Pattern "dorianwellness|#comprar|product-btn-buy" | Select-Object -First 35 LineNumber, Line | Format-Table -AutoSize
