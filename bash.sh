#!/bin/bash
# ==============================================================================
# HỆ THỐNG TRIỂN KHAI TỰ ĐỘNG - PHISHINGAI DETECTION SYSTEM
# Kịch bản triển khai hoàn chỉnh cho Server VMware / Windows Git Bash / Linux
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
    echo -e "-> Đang ở trong thư mục dự án Git. Tiến hành kéo mã nguồn mới nhất..."
    git pull origin main || echo -e "${YELLOW}Cảnh báo: Không thể pull tự động, sẽ tiếp tục sử dụng mã nguồn hiện tại.${NC}"
elif [ -d "$PROJECT_DIR" ]; then
    echo -e "-> Phát hiện thư mục $PROJECT_DIR, chuyển vào thư mục dự án..."
    cd "$PROJECT_DIR"
    git pull origin main || true
else
    echo -e "-> Đang clone dự án từ GitHub: $REPO_URL ..."
    git clone "$REPO_URL"
    cd "$PROJECT_DIR"
fi

echo -e "${GREEN}✔ Mã nguồn dự án đã sẵn sàng!${NC}"

# ------------------------------------------------------------------------------
# BƯỚC 2: KHỞI TẠO FILE CẤU HÌNH .ENV VỚI API KEYS CHUẨN
# ------------------------------------------------------------------------------
echo -e "\n${YELLOW}[BƯỚC 2/6] Thiết lập file cấu hình môi trường .env ...${NC}"

cat << 'EOF' > .env
# API Keys for PhishingAI Detection System

# VirusTotal API Key (https://www.virustotal.com/)
VIRUSTOTAL_API_KEY=f760931f05bccd12a0072d9a6dfcdac95d0fc37547a72bbe72f88a5e1107197a

# Google Safe Browsing API Key (https://developers.google.com/safe-browsing)
GOOGLE_SAFE_BROWSING_API_KEY=AIzaSyA3r7GbF0swsjECuvQz5_1pwO0lNLp86t0

# APIVoid / URLVoid API Key (https://www.apivoid.com/)
APIVOID_API_KEY=8o2o1rgWocqCGPwr3fXEzioDGYJHR55C_N30uZ8

# Other Configurations
UPLOAD_FOLDER=./Uploads
FLASK_PORT=5000
FLASK_HOST=0.0.0.0
EOF

echo -e "${GREEN}✔ Đã tạo file .env với đầy đủ các API key chuẩn xác!${NC}"

# ------------------------------------------------------------------------------
# BƯỚC 3: TẢI MODEL TỪ GOOGLE DRIVE (NẾU CHƯA CÓ)
# ------------------------------------------------------------------------------
echo -e "\n${YELLOW}[BƯỚC 3/6] Kiểm tra và tải mô hình AI từ Google Drive...${NC}"
DRIVE_FOLDER_URL="https://drive.google.com/drive/folders/1ltYSkrmKjq8IKwQWYs4W0Q_riZWN5ZuG"

# Kiểm tra xem models_advance đã có file chưa
NEED_DOWNLOAD=true
if [ -d "models_advance" ] && [ -f "models_advance/efficientnetv2m_phishing.keras" ]; then
    echo -e "${GREEN}✔ Đã phát hiện thư mục models_advance và các file mô hình đầy đủ. Bỏ qua bước tải lại.${NC}"
    NEED_DOWNLOAD=false
fi

if [ "$NEED_DOWNLOAD" = true ]; then
    echo -e "-> Đang kiểm tra công cụ gdown để tải thư mục từ Google Drive..."
    
    # Kiểm tra Python/pip để cài đặt gdown nếu chưa có
    if command -v pip &> /dev/null || command -v pip3 &> /dev/null; then
        echo -e "-> Đang cài đặt/cập nhật thư viện gdown..."
        pip install --upgrade gdown || pip3 install --upgrade gdown
    else
        echo -e "${YELLOW}Cảnh báo: Không tìm thấy pip trên môi trường hiện tại. Nếu gặp lỗi tải, vui lòng cài đặt Python/pip.${NC}"
    fi

    echo -e "-> Bắt đầu tải thư mục models từ Google Drive link: ${DRIVE_FOLDER_URL}"
    # Tải cả thư mục từ Drive về thư mục tạm
    python -m gdown --folder "$DRIVE_FOLDER_URL" -O ./temp_drive_models || python3 -m gdown --folder "$DRIVE_FOLDER_URL" -O ./temp_drive_models || gdown --folder "$DRIVE_FOLDER_URL" -O ./temp_drive_models || true

    # Di chuyển các thư mục models về đúng vị trí dự án
    if [ -d "./temp_drive_models" ]; then
        if [ -d "./temp_drive_models/models" ]; then
            mkdir -p models
            cp -r ./temp_drive_models/models/* ./models/ 2>/dev/null || true
        fi
        if [ -d "./temp_drive_models/models_advance" ]; then
            mkdir -p models_advance
            cp -r ./temp_drive_models/models_advance/* ./models_advance/ 2>/dev/null || true
        fi
        # Dọn dẹp thư mục tạm
        rm -rf ./temp_drive_models
    fi
fi

# Đảm bảo có thư mục models_advance để Dockerfile copy
mkdir -p models_advance
mkdir -p models
echo -e "${GREEN}✔ Kiểm tra cấu trúc thư mục models hoàn tất!${NC}"

# ------------------------------------------------------------------------------
# BƯỚC 4: TẠO THƯ MỤC UPLOADS & DỮ LIỆU CẦN THIẾT
# ------------------------------------------------------------------------------
echo -e "\n${YELLOW}[BƯỚC 4/6] Khởi tạo thư mục Uploads và phân quyền...${NC}"
mkdir -p Uploads
chmod 777 Uploads 2>/dev/null || true
echo -e "${GREEN}✔ Thư mục Uploads đã sẵn sàng!${NC}"

# ------------------------------------------------------------------------------
# BƯỚC 5: BUILD VÀ CHẠY DOCKER CONTAINER
# ------------------------------------------------------------------------------
echo -e "\n${YELLOW}[BƯỚC 5/6] Tiến hành Build và Khởi chạy Docker Container...${NC}"

# Kiểm tra Docker daemon
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Lỗi: Docker chưa được bật hoặc người dùng hiện tại không có quyền thực thi Docker!${NC}"
    echo -e "Vui lòng khởi động Docker Service hoặc thêm quyền (sudo usermod -aG docker \$USER)."
    exit 1
fi

# Chọn lệnh docker-compose phù hợp
DOCKER_COMPOSE_CMD="docker compose"
if ! docker compose version > /dev/null 2>&1; then
    if command -v docker-compose &> /dev/null; then
        DOCKER_COMPOSE_CMD="docker-compose"
    else
        echo -e "${RED}Lỗi: Không tìm thấy docker compose hoặc docker-compose!${NC}"
        exit 1
    fi
fi

echo -e "-> Đang dừng các container cũ nếu đang chạy..."
$DOCKER_COMPOSE_CMD down || true

echo -e "-> Đang Build Docker Image (gồm React Frontend + Python Backend + AI Models)..."
$DOCKER_COMPOSE_CMD build

echo -e "-> Đang khởi động Container ở chế độ chạy ngầm (Detached mode)..."
$DOCKER_COMPOSE_CMD up -d

# ------------------------------------------------------------------------------
# BƯỚC 6: KIỂM TRA TRẠNG THÁI VÀ HOÀN TẤT
# ------------------------------------------------------------------------------
echo -e "\n${YELLOW}[BƯỚC 6/6] Kiểm tra trạng thái hoạt động...${NC}"
sleep 3
docker ps --filter "name=phishguard_system"

echo -e "\n${BLUE}======================================================================${NC}"
echo -e "${GREEN}   CHÚC MỪNG! HỆ THỐNG PHISHING AI ĐÃ ĐƯỢC DEPLOY THÀNH CÔNG!       ${NC}"
echo -e "${BLUE}======================================================================${NC}"
echo -e "Địa chỉ truy cập ứng dụng:"
echo -e "  - Tại máy server:           ${GREEN}http://localhost:5000${NC}"
echo -e "  - Từ máy khác trong mạng:   ${GREEN}http://<IP_MÁY_CHỦ_VMWARE>:5000${NC}"
echo -e "\nCác lệnh hữu ích để quản trị:"
echo -e "  - Xem log thời gian thực:    ${YELLOW}docker logs -f phishguard_system${NC}"
echo -e "  - Dừng hệ thống:             ${YELLOW}$DOCKER_COMPOSE_CMD down${NC}"
echo -e "  - Khởi động lại hệ thống:    ${YELLOW}$DOCKER_COMPOSE_CMD restart${NC}"
echo -e "${BLUE}======================================================================${NC}\n"
