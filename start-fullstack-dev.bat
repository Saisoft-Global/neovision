@echo off
echo 🚀 Starting Full-Stack IDP Development Environment
echo ================================================

echo 🔧 Starting Backend Server...
start "IDP Backend" cmd /k "cd backend && neoidp\Scripts\activate && python main.py"

echo ⏳ Waiting for backend to start...
timeout /t 10 /nobreak > nul

echo 🎨 Starting Frontend Development Server...
start "IDP Frontend" cmd /k "npm run dev"

echo ✅ Both servers are starting...
echo 📱 Frontend: http://localhost:5173
echo 🔧 Backend: http://localhost:8000
echo 📚 API Docs: http://localhost:8000/docs

echo.
echo Press any key to close this window...
pause > nul
