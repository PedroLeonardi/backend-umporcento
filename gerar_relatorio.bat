@echo off
set "OUTPUT=relatorio_projeto.txt"

echo ========================================================
echo Gerando relatorio (Metodo Universal - Sem Git)
echo Ignorando: node_modules, .git e package-lock.json
echo ========================================================

if exist "%OUTPUT%" del "%OUTPUT%"

powershell -Command "Get-ChildItem -Recurse -File -Include *.js,*.jsx,*.ts,*.tsx,*.json,*.html,*.css,*.py,*.c,*.cpp,*.h,*.ino,*.md,*.txt | Where-Object { $_.FullName -notmatch '\\node_modules\\' -and $_.FullName -notmatch '\\.git\\' -and $_.Name -ne '%OUTPUT%' -and $_.Name -ne 'package-lock.json' } | ForEach-Object { Write-Host 'Lendo: ' $_.Name; Add-Content -LiteralPath '%OUTPUT%' -Value ('=========================================' + [Environment]::NewLine + 'ARQUIVO: ' + $_.FullName + [Environment]::NewLine + '=========================================' + [Environment]::NewLine); Get-Content -LiteralPath $_.FullName | Add-Content -LiteralPath '%OUTPUT%'; Add-Content -LiteralPath '%OUTPUT%' -Value ([Environment]::NewLine + [Environment]::NewLine) }"

echo.
echo ========================================================
echo SUCESSO!
echo O arquivo "%OUTPUT%" foi criado sem o package-lock.json.
echo ========================================================
pause