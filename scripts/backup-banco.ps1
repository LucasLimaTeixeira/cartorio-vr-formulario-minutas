# Backup do banco Supabase (estrutura + dados) em arquivo local datado.
# Uso:  npm run backup:banco            (ou)  powershell -File ./scripts/backup-banco.ps1 -Destino D:\Backups
# Requer: pg_dump 17+ (PostgreSQL client) e a senha do banco em SUPABASE_DB_PASSWORD
#         ou no arquivo .env.backup.local (ignorado pelo Git).
param(
  [string]$Destino = $(if ($env:OneDrive) { Join-Path $env:OneDrive 'Backups\Cartorio-OS' } else { Join-Path $env:USERPROFILE 'Backups\Cartorio-OS' }),
  [int]$ManterUltimos = 30
)

$ErrorActionPreference = 'Stop'
$raiz = Split-Path -Parent $PSScriptRoot
$projectRef = (Get-Content (Join-Path $raiz 'supabase\.temp\project-ref') -Raw).Trim()
$poolerUrl = (Get-Content (Join-Path $raiz 'supabase\.temp\pooler-url') -Raw).Trim()

$senha = $env:SUPABASE_DB_PASSWORD
$arquivoSenha = Join-Path $raiz '.env.backup.local'
if (-not $senha -and (Test-Path $arquivoSenha)) {
  $linha = Get-Content $arquivoSenha | Where-Object { $_ -match '^\s*SUPABASE_DB_PASSWORD\s*=' } | Select-Object -First 1
  if ($linha) { $senha = ($linha -split '=', 2)[1].Trim().Trim('"') }
}
if (-not $senha) {
  throw "Senha do banco não encontrada. Crie .env.backup.local com SUPABASE_DB_PASSWORD=... (Supabase > Project Settings > Database)."
}

$pgDump = Get-Command pg_dump -ErrorAction SilentlyContinue
if (-not $pgDump) {
  $candidato = Get-ChildItem 'C:\Program Files\PostgreSQL\*\bin\pg_dump.exe' -ErrorAction SilentlyContinue | Sort-Object FullName -Descending | Select-Object -First 1
  if ($candidato) { $pgDump = $candidato.FullName } else { throw "pg_dump não encontrado. Instale o PostgreSQL 17 (apenas 'Command Line Tools')." }
} else { $pgDump = $pgDump.Source }

$carimbo = Get-Date -Format 'yyyy-MM-dd_HHmm'
New-Item -ItemType Directory -Force $Destino | Out-Null
$arquivo = Join-Path $Destino "cartorio-os_${projectRef}_$carimbo.dump"

# pooler-url vem sem senha: postgresql://usuario@host:porta/banco
$env:PGPASSWORD = $senha
try {
  Write-Host "Gerando backup em $arquivo ..."
  & $pgDump --dbname $poolerUrl --format=custom --no-owner --no-privileges `
    --schema=public --schema=auth --schema=storage --file $arquivo
  if ($LASTEXITCODE -ne 0) { throw "pg_dump falhou (código $LASTEXITCODE)." }
} finally {
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}

$tamanho = [math]::Round((Get-Item $arquivo).Length / 1KB, 1)
Write-Host "Backup concluído: $tamanho KB"

Get-ChildItem $Destino -Filter 'cartorio-os_*.dump' | Sort-Object LastWriteTime -Descending |
  Select-Object -Skip $ManterUltimos | Remove-Item -Force
