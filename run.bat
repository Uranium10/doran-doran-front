call npm install

:: 1. 서버를 현재 창의 백그라운드(/B)에서 실행
start /B npm run dev -- -H 0.0.0.0

:: 2. 서버가 켜질 때까지 3초 대기 (숫자를 늘리거나 줄여도 됨)
timeout /t 2 /nobreak > NUL

:: 3. 브라우저 실행
start http://localhost:3000/#criteria#library