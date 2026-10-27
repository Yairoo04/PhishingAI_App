@echo off
chcp 65001 >nul
:: ==============================================================================
:: HỆ THỐNG TRIỂN KHAI TỰ ĐỘNG PHISHING AI TRÊN WINDOWS
:: ==============================================================================
title Triển khai hệ thống PhishingAI Detection System

echo ======================================================================
echo    BẮT ĐẦU QUÁ TRÌNH TỰ ĐỘNG BUILD ^& DEPLOY TRÊN WINDOWS
echo ======================================================================

:: Bước 1: Git
echo.
echo [BƯỚC 1/6] Kiểm tra mã nguồn từ GitHub...
if exist ".git" (
    echo Đang ở trong thư mục dự án Git. Tiến hành git pull...
    git pull origin main
) else (
    if exist "PhishingAI_App" (
        cd PhishingAI_App
        git pull origin main
    ) else (
        echo Clone dự án từ GitHub...
        git clone https://github.com/Yairoo04/PhishingAI_App.git
        cd PhishingAI_App
    )
)

:: Bước 2: Tạo file .env
echo.
echo [BƯỚC 2/6] Tạo file cấu hình môi trường .env...
(
echo # API Keys for PhishingAI Detection System
echo VIRUSTOTAL_API_KEY=f760931f05bccd12a0072d9a6dfcdac95d0fc37547a72bbe72f88a5e1107197a
echo GOOGLE_SAFE_BROWSING_API_KEY=AIzaSyA3r7GbF0swsjECuvQz5_1pwO0lNLp86t0
echo APIVOID_API_KEY=8o2o1rgWocqCGPwr3fXEzioDGYJHR55C_N30uZ8
echo UPLOAD_FOLDER=./Uploads
echo FLASK_PORT=5000
echo FLASK_HOST=0.0.0.0
) > .env
echo Đã tạo file .env thành công!

:: Bước 3: Kiểm tra models
echo.
echo [BƯỚC 3/6] Kiểm tra thư mục mô hình AI (models_advance)...
if not exist "models_advance\efficientnetv2m_phishing.keras" (
    echo Thư mục models_advance chưa có file mô hình.
    echo Tiến hành tải từ Google Drive qua gdown...
    pip install --upgrade gdown
    python -m gdown --folder "https://drive.google.com/drive/folders/1ltYSkrmKjq8IKwQWYs4W0Q_riZWN5ZuG" -O .\temp_drive_models
    if exist "temp_drive_models\models" xcopy /E /I /Y temp_drive_models\models models\
    if exist "temp_drive_models\models_advance" xcopy /E /I /Y temp_drive_models\models_advance models_advance\
    rmdir /S /Q temp_drive_models
) else (
    echo Đã có sẵn mô hình models_advance!
)

if not exist "models" mkdir models
if not exist "models_advance" mkdir models_advance

:: Bước 4: Tạo thư mục Uploads
echo.
echo [BƯỚC 4/6] Khởi tạo thư mục Uploads...
if not exist "Uploads" mkdir Uploads

:: Bước 5: Docker Build & Up
echo.
echo [BƯỚC 5/6] Tiến hành Build và Chạy Docker...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [LỖI] Docker Desktop chưa được bật! Vui lòng khởi động Docker Desktop trước.
    pause
    exit /b 1
)

docker compose down
docker compose build
docker compose up -d

:: Bước 6: Hoàn tất
echo.
echo [BƯỚC 6/6] Trạng thái container:
docker ps --filter "name=phishguard_system"

echo.
echo ======================================================================
echo    DEPLOY HOÀN TẤT!
echo    Truy cập hệ thống tại: http://localhost:5000
echo ======================================================================
pause
