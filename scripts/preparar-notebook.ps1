$ErrorActionPreference = 'Stop'

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw 'Node.js não foi encontrado. Instale a versão LTS em https://nodejs.org e execute este arquivo novamente.'
}

if (-not (Test-Path 'package.json')) {
  throw 'Execute este arquivo dentro da pasta raiz do projeto.'
}

Write-Host 'Instalando dependências do projeto...' -ForegroundColor Cyan
npm ci

if (-not (Test-Path '.env.local')) {
  Write-Host ''
  Write-Host 'Configuração do Supabase' -ForegroundColor Cyan
  Write-Host 'Encontre esses dados em Supabase > Project Settings > API.'
  $supabaseUrl = Read-Host 'VITE_SUPABASE_URL'
  $supabaseAnonKey = Read-Host 'VITE_SUPABASE_ANON_KEY'

  if ([string]::IsNullOrWhiteSpace($supabaseUrl) -or [string]::IsNullOrWhiteSpace($supabaseAnonKey)) {
    throw 'As duas configurações do Supabase são obrigatórias.'
  }

  @(
    "VITE_SUPABASE_URL=$supabaseUrl"
    "VITE_SUPABASE_ANON_KEY=$supabaseAnonKey"
  ) | Set-Content -Path '.env.local' -Encoding utf8
  Write-Host 'Arquivo .env.local criado somente neste notebook.' -ForegroundColor Green
} else {
  Write-Host 'Arquivo .env.local já encontrado; mantendo a configuração existente.' -ForegroundColor Yellow
}

Write-Host ''
Write-Host 'Tudo pronto. Execute: npm run dev' -ForegroundColor Green
