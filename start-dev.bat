@echo off
echo 🚀 Starting IDP Backend Development Server
echo ==========================================

cd backend

echo 🔧 Activating virtual environment...
call neoidp\Scripts\activate

echo ✅ Virtual environment activated
echo 🏃 Starting server...
python main.py

pause
