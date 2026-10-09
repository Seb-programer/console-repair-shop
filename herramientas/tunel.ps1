# Abre el tunel temporal de Cloudflare y lo cierra cuando desaparece la ventana de publicar.bat
# (se cierre con una tecla, con la X o de cualquier otra forma).
param(
  [Parameter(Mandatory)] [int] $Padre,
  [Parameter(Mandatory)] [string] $Log,
  [string] $Url = 'http://localhost:5173',
  [string] $Cloudflared = 'C:\Program Files (x86)\cloudflared\cloudflared.exe'
)

$tunel = Start-Process -FilePath $Cloudflared `
  -ArgumentList 'tunnel', '--no-autoupdate', '--url', $Url, '--logfile', "`"$Log`"" `
  -WindowStyle Hidden -PassThru

while (-not $tunel.HasExited -and (Get-Process -Id $Padre -ErrorAction SilentlyContinue)) {
  Start-Sleep -Seconds 2
}

if (-not $tunel.HasExited) { Stop-Process -Id $tunel.Id -Force }
