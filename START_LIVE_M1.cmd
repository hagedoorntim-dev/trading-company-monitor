@echo off
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
 echo Node.js 22 LTS of hoger is nodig. Installeer alleen op een eigen toegestane computer.
 pause
 exit /b 1
)
if not exist node_modules (
 call npm.cmd install --no-audit --no-fund
 if errorlevel 1 (
  echo Installatie mislukt.
  pause
  exit /b 1
 )
)
if exist TradingCompany_M1_warmup.seed.csv set "TC_SEED=%CD%\TradingCompany_M1_warmup.seed.csv"
echo Bronproef (geen orders):
call npm.cmd run probe:m1
if errorlevel 1 (
 echo Geen verse gekoppelde M1-kaarsen. Stop; dashboard kan nog niet live werken.
 pause
 exit /b 1
)
echo Open http://127.0.0.1:8787/ in je browser. Laat dit venster open.
echo Stop met Ctrl+C. Alle data blijven in private-live.
call npm.cmd run live:m1
pause
