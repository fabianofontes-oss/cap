@echo off
echo ============================================
echo   CAP Master - Publicar Regras do Firebase
echo ============================================
echo.
echo Passo 1: Fazendo login no Firebase...
echo (Vai abrir o navegador - autorize com sua conta Google)
echo.
firebase login
echo.
echo Passo 2: Publicando regras do Firestore...
firebase deploy --only firestore:rules
echo.
echo ============================================
echo   CONCLUIDO! As perguntas devem aparecer.
echo ============================================
pause
