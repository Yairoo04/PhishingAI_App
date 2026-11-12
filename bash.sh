#!/bin/bash
# ==============================================================================
# HỆ THỐNG TRIỂN KHAI TỰ ĐỘNG - PHISHINGAI DETECTION SYSTEM
# Kịch bản triển khai hoàn chỉnh cho Server VMware / Windows Git Bash / Linux
# Hỗ trợ tự động: Docker Mode & Native Python venv Mode
# ==============================================================================

set -e

# Đảm bảo hiển thị đúng tiếng Việt có dấu trên terminal
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8

# Màu sắc hiển thị
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================================================${NC}"
echo -e "${GREEN}   BẮT ĐẦU QUÁ TRÌNH TỰ ĐỘNG BUILD & DEPLOY HỆ THỐNG PHISHING AI    ${NC}"
echo -e "${BLUE}======================================================================${NC}"

# ------------------------------------------------------------------------------
# BƯỚC 1: KIỂM TRA MÃ NGUỒN VÀ CLONE TỪ GITHUB
# ------------------------------------------------------------------------------
REPO_URL="https://github.com/Yairoo04/PhishingAI_App.git"
PROJECT_DIR="PhishingAI_App"

echo -e "\n${YELLOW}[BƯỚC 1/6] Kiểm tra mã nguồn từ GitHub...${NC}"

if [ -d ".git" ]; then
    echo -e "-> Đang ở trong thư mục dự án Git. Kiểm tra cập nhật..."
    git pull origin main 2>/dev/null || echo -e "${YELLOW}Thông báo: Tiếp tục sử dụng mã nguồn hiện tại.${NC}"
elif [ -d "$PROJECT_DIR" ]; then
    echo -e "-> Phát hiện thư mục $PROJECT_DIR, chuyển vào thư mục dự án..."
    cd "$PROJECT_DIR"
    git pull origin main 2>/dev/null || true
else
    echo -e "-> Đang clone dự án từ GitHub: $REPO_URL ..."
    git clone "$REPO_URL"
    cd "$PROJECT_DIR"
fi

echo -e "${GREEN}✔ Mã nguồn dự án đã sẵn sàng!${NC}"

# ------------------------------------------------------------------------------
# BƯỚC 2: THIẾT LẬP FILE CẤU HÌNH .ENV
# ------------------------------------------------------------------------------
echo -e "\n${YELLOW}[BƯỚC 2/6] Thiết lập file cấu hình môi trường .env ...${NC}"

if [ ! -f ".env" ]; then
    echo -e "-> File .env chưa tồn tại. Đang tạo file .env mặc định..."
    cat << 'EOF' > .env
# API Keys for PhishingAI Detection System

# VirusTotal API Key (https://www.virustotal.com/)
VIRUSTOTAL_API_KEY=f760931f05bccd12a0072d9a6dfcdac95d0fc37547a72bbe72f88a5e1107197a

# Google Safe Browsing API Key (https://developers.google.com/safe-browsing)
GOOGLE_SAFE_BROWSING_API_KEY=AIzaSyA3r7GbF0swsjECuvQz5_1pwO0lNLp86t0

# APIVoid / URLVoid API Key (https://www.apivoid.com/)
APIVOID_API_KEY=8o2o1rgWocqCGPwr3fXEzioDGYJHR55C_N30uZ8

# urlscan.io Community API Key (https://urlscan.io/)
URLSCAN_API_KEY=01a1cda3-16df-72eb-89fe-7a8617bc0053

# AlienVault OTX API Key (https://otx.alienvault.com/)
OTX_API_KEY=12223ed85c09f50e0ab29a7d0767570c9758839e6a1f4b150f119dfd6870f4d8

# Other Configurations
UPLOAD_FOLDER=./Uploads
FLASK_PORT=5000
FLASK_HOST=0.0.0.0
EOF
    echo -e "${GREEN}✔ Đã tạo file .env mới thành công!${NC}"
else
    echo -e "${GREEN}✔ File .env đã tồn tại. Giữ nguyên cấu hình hiện tại!${NC}"
fi

# ------------------------------------------------------------------------------
# BƯỚC 3: KIỂM TRA MÔ HÌNH AI (MODELS)
# ------------------------------------------------------------------------------
echo -e "\n${YELLOW}[BƯỚC 3/6] Kiểm tra mô hình AI trong thư mục models...${NC}"
DRIVE_FOLDER_URL="https://drive.google.com/drive/folders/1ltYSkrmKjq8IKwQWYs4W0Q_riZWN5ZuG"

NEED_DOWNLOAD=true
if [ -d "models_advance" ] && [ -f "models_advance/efficientnetv2m_phishing.keras" ]; then
    echo -e "${GREEN}✔ Đã có đầy đủ file mô hình trong models_advance!${NC}"
    NEED_DOWNLOAD=false
elif [ -d "models" ] && [ -f "models/efficientnetv2m_phishing.keras" ]; then
    echo -e "${GREEN}✔ Đã có file mô hình trong thư mục models!${NC}"
    NEED_DOWNLOAD=false
fi

if [ "$NEED_DOWNLOAD" = true ]; then
    echo -e "-> Đang kiểm tra công cụ gdown để tải thư mục từ Google Drive..."
    if command -v pip &> /dev/null || command -v pip3 &> /dev/null; then
        pip install --upgrade gdown || pip3 install --upgrade gdown || true
    fi

    echo -e "-> Bắt đầu tải thư mục models từ Google Drive..."
    python -m gdown --folder "$DRIVE_FOLDER_URL" -O ./temp_drive_models || python3 -m gdown --folder "$DRIVE_FOLDER_URL" -O ./temp_drive_models || true

    if [ -d "./temp_drive_models" ]; then
        mkdir -p models models_advance
        if [ -d "./temp_drive_models/models" ]; then
            cp -r ./temp_drive_models/models/* ./models/ 2>/dev/null || true
        fi
        if [ -d "./temp_drive_models/models_advance" ]; then
            cp -r ./temp_drive_models/models_advance/* ./models_advance/ 2>/dev/null || true
        fi
        rm -rf ./temp_drive_models
    fi
fi

mkdir -p models models_advance
echo -e "${GREEN}✔ Thư mục mô hình AI đã sẵn sàng!${NC}"

# ------------------------------------------------------------------------------
# BƯỚC 4: TẠO THƯ MỤC UPLOADS & DỮ LIỆU
# ------------------------------------------------------------------------------
echo -e "\n${YELLOW}[BƯỚC 4/6] Khởi tạo thư mục Uploads và data...${NC}"
mkdir -p Uploads backend/data
chmod 777 Uploads 2>/dev/null || true
echo -e "${GREEN}✔ Thư mục Uploads và data đã sẵn sàng!${NC}"

# ------------------------------------------------------------------------------
# BƯỚC 5: KHỞI CHẠY HỆ THỐNG (DOCKER HOẶC NATIVE PYTHON VENV)
# ------------------------------------------------------------------------------
echo -e "\n${YELLOW}[BƯỚC 5/6] Tiến hành triển khai và khởi chạy ứng dụng...${NC}"

# Đọc port từ file .env
ACTIVE_PORT=$(grep -E '^FLASK_PORT=' .env 2>/dev/null | cut -d '=' -f2 | tr -d ' \r\n')
if [ -z "$ACTIVE_PORT" ]; then
    ACTIVE_PORT="5000"
fi

# Kiểm tra Docker
USE_DOCKER=false
if command -v docker &> /dev/null && docker info > /dev/null 2>&1; then
    USE_DOCKER=true
fi

if [ "$USE_DOCKER" = true ]; then
    echo -e "${GREEN}✔ Phát hiện Docker đang hoạt động. Sử dụng chế độ Docker Container!${NC}"

    DOCKER_COMPOSE_CMD="docker compose"
    if ! docker compose version > /dev/null 2>&1; then
        if command -v docker-compose &> /dev/null; then
            DOCKER_COMPOSE_CMD="docker-compose"
        else
            echo -e "${RED}Lỗi: Không tìm thấy docker compose!${NC}"
            exit 1
        fi
    fi

    echo -e "-> Đang dừng các container cũ..."
    $DOCKER_COMPOSE_CMD down || true

    echo -e "-> Đang Build Docker Image..."
    $DOCKER_COMPOSE_CMD build

    echo -e "-> Đang khởi động Container..."
    $DOCKER_COMPOSE_CMD up -d

    sleep 3
    docker ps --filter "name=phishguard_system"

    echo -e "\n${BLUE}======================================================================${NC}"
    echo -e "${GREEN}   DEPLOY DOCKER THÀNH CÔNG!                                        ${NC}"
    echo -e "${BLUE}======================================================================${NC}"
    echo -e "Truy cập ứng dụng tại:  ${GREEN}http://localhost:${ACTIVE_PORT}${NC}"
    echo -e "Xem log:                ${YELLOW}docker logs -f phishguard_system${NC}"
    echo -e "Dừng hệ thống:          ${YELLOW}$DOCKER_COMPOSE_CMD down${NC}"
    echo -e "${BLUE}======================================================================${NC}\n"

else
    echo -e "${YELLOW}Notice: Docker chưa bật hoặc chưa cài đặt. Chuyển sang chế độ chạy trực tiếp (Native Python venv)...${NC}"

    # Tìm lệnh Python phù hợp
    PYTHON_BIN="python"
    if command -v python3 &> /dev/null; then
        PYTHON_BIN="python3"
    fi

    # 1. Kiểm tra / Tạo môi trường ảo venv
    if [ ! -d "venv" ]; then
        echo -e "-> Đang khởi tạo môi trường ảo Python venv..."
        $PYTHON_BIN -m venv venv
    fi

    # 2. Kích hoạt venv (hỗ trợ cả Windows Git Bash và Linux)
    if [ -f "venv/Scripts/activate" ]; then
        source venv/Scripts/activate
    elif [ -f "venv/bin/activate" ]; then
        source venv/bin/activate
    fi

    # 3. Cài đặt dependencies nếu cần
    echo -e "-> Kiểm tra thư viện Python..."
    pip install -r requirements.txt --quiet || pip install -r requirements.txt

    # 4. Cài đặt Playwright Chromium nếu chưa có
    python -m playwright install chromium 2>/dev/null || true

    # 5. Build frontend nếu thư mục build chưa tồn tại
    if [ ! -d "frontend/build" ]; then
        echo -e "-> Đang build frontend React..."
        if command -v npm &> /dev/null; then
            (cd frontend && npm install --legacy-peer-deps && npm run build)
        fi
    fi

    echo -e "\n${BLUE}======================================================================${NC}"
    echo -e "${GREEN}   KHỞI CHẠY HỆ THỐNG THÀNH CÔNG TRÊN NATIVE PYTHON!                ${NC}"
    echo -e "${BLUE}======================================================================${NC}"
    echo -e "Địa chỉ truy cập:   ${GREEN}http://localhost:${ACTIVE_PORT}${NC}"
    echo -e "Nhấn ${RED}Ctrl + C${NC} để dừng server."
    echo -e "${BLUE}======================================================================${NC}\n"

    # 6. Chạy Flask Server
    export PYTHONPATH="backend"
    python backend/app.py
fi
