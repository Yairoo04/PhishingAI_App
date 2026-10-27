import json
import os
import re

FRONTEND_DIR = r"d:\3. PTIT\2. NCKH\4. NCKH_Phishing\PhishingAI_Detection_System\frontend"
LOCALES_DIR = os.path.join(FRONTEND_DIR, "src", "i18n", "locales")
FEATURES_DIR = os.path.join(FRONTEND_DIR, "src", "pages", "Features")

vi_path = os.path.join(LOCALES_DIR, "vi.json")
en_path = os.path.join(LOCALES_DIR, "en.json")

with open(vi_path, 'r', encoding='utf-8') as f: vi_data = json.load(f)
with open(en_path, 'r', encoding='utf-8') as f: en_data = json.load(f)

# Define translations
translations = {
    "features": {
        "api": {
            "vi": {
                "portal": "Developer Portal",
                "title": "Security",
                "title_hl": "API Access",
                "desc": "RESTful API - Tích hợp PhishingAI vào quy trình bảo mật của bạn",
                "your_key": "Your API Key",
                "copy": "Copy Key",
                "quick_start": "Quick Start - Python",
                "endpoints": "Endpoints",
                "desc_scan": "Scan any URL for phishing",
                "desc_file": "Upload and scan PDF/EXE documents",
                "desc_history": "Retrieve scan logs"
            },
            "en": {
                "portal": "Developer Portal",
                "title": "Security",
                "title_hl": "API Access",
                "desc": "RESTful API - Integrate PhishingAI into your security workflow",
                "your_key": "Your API Key",
                "copy": "Copy Key",
                "quick_start": "Quick Start - Python",
                "endpoints": "Endpoints",
                "desc_scan": "Scan any URL for phishing",
                "desc_file": "Upload and scan PDF/EXE documents",
                "desc_history": "Retrieve scan logs"
            }
        },
        "brand": {
            "vi": {
                "badge": "Visual Brand Protection",
                "title": "Brand",
                "title_hl": "Impersonation",
                "desc": "Phát hiện trang web giả mạo thương hiệu nổi tiếng - 50+ nhãn hiệu được hỗ trợ",
                "analyze_title": "Phân tích Hình ảnh/Screenshot",
                "analyze_desc": "Tải lên ảnh chụp màn hình trang web để đối chiếu logo và layout với thương hiệu thật.",
                "analyze_btn": "Tải ảnh lên để phân tích",
                "analyzing": "Đang phân tích...",
                "supported": "Thương hiệu được hỗ trợ phổ biến"
            },
            "en": {
                "badge": "Visual Brand Protection",
                "title": "Brand",
                "title_hl": "Impersonation",
                "desc": "Detect fake websites of popular brands - 50+ brands supported",
                "analyze_title": "Image/Screenshot Analysis",
                "analyze_desc": "Upload website screenshots to match logos and layouts against real brands.",
                "analyze_btn": "Upload image to analyze",
                "analyzing": "Analyzing...",
                "supported": "Popular Supported Brands"
            }
        },
        "community": {
            "vi": {
                "badge": "Collective Defense",
                "title": "Community",
                "title_hl": "Reports",
                "desc": "Cùng cộng đồng xây dựng cơ sở dữ liệu về các mối đe dọa mới nhất",
                "report_new": "Báo cáo mối đe dọa mới",
                "target": "URL / Target",
                "type": "Loại mối đe dọa",
                "type_1": "Phishing Website",
                "type_2": "Malware Distribution",
                "type_3": "Social Engineering",
                "type_4": "Other Security Risk",
                "detail": "Mô tả chi tiết",
                "submit": "Gửi Báo Cáo",
                "recent": "Báo cáo gần đây từ cộng đồng",
                "new": "MỚI",
                "time_ago": "2 giờ trước",
                "example_desc": "Phishing giả mạo trang đăng nhập Apple iCloud"
            },
            "en": {
                "badge": "Collective Defense",
                "title": "Community",
                "title_hl": "Reports",
                "desc": "Build the latest threats database together with the community",
                "report_new": "Report a new threat",
                "target": "URL / Target",
                "type": "Threat Type",
                "type_1": "Phishing Website",
                "type_2": "Malware Distribution",
                "type_3": "Social Engineering",
                "type_4": "Other Security Risk",
                "detail": "Detailed Description",
                "submit": "Submit Report",
                "recent": "Recent reports from the community",
                "new": "NEW",
                "time_ago": "2 hours ago",
                "example_desc": "Phishing mimicking Apple iCloud login page"
            }
        },
        "darkweb": {
            "vi": {
                "badge": "Data Breach Monitor",
                "title": "Dark Web",
                "title_hl": "Checker",
                "desc": "Kiểm tra xem thông tin cá nhân của bạn có bị rò rỉ trên Dark Web hay không",
                "placeholder": "Nhập email của bạn...",
                "check_btn": "Kiểm tra ngay",
                "checking": "Đang kiểm tra...",
                "stat_1": "Dữ liệu breach",
                "stat_2": "Giám sát liên tục",
                "privacy_title": "Privacy First",
                "privacy_desc": "Chúng tôi không bao giờ lưu trữ email của bạn. Quá trình kiểm tra được thực hiện thông qua các API bảo mật được mã hóa đầu cuối."
            },
            "en": {
                "badge": "Data Breach Monitor",
                "title": "Dark Web",
                "title_hl": "Checker",
                "desc": "Check if your personal information has been leaked on the Dark Web",
                "placeholder": "Enter your email...",
                "check_btn": "Check Now",
                "checking": "Checking...",
                "stat_1": "Breached records",
                "stat_2": "Continuous monitoring",
                "privacy_title": "Privacy First",
                "privacy_desc": "We never store your email. Checks are performed through end-to-end encrypted security APIs."
            }
        },
        "dashboard": {
            "vi": {
                "badge": "Live Threat Intelligence",
                "title": "Security",
                "title_hl": "Dashboard",
                "desc": "Giám sát mối đe dọa theo thời gian thực - PhishingAI",
                "sys_time": "SYSTEM TIME",
                "total_scans": "Total Scans",
                "blocked": "Threats Blocked",
                "safe": "Safe Confirmed",
                "accuracy": "ML Accuracy",
                "chart_title": "Hoạt động Quét - 30 Ngày",
                "chart_sub": "Số lượt phân tích theo ngày",
                "high_risk": "High Risk",
                "normal": "Normal",
                "days_ago": "30 days ago",
                "today": "Today",
                "breakdown": "Phân loại Mối đe dọa",
                "recent": "Recent Scans (Real-Time)",
                "no_scans": "No scans recorded yet. Start scanning to see data here."
            },
            "en": {
                "badge": "Live Threat Intelligence",
                "title": "Security",
                "title_hl": "Dashboard",
                "desc": "Real-time threat monitoring - PhishingAI",
                "sys_time": "SYSTEM TIME",
                "total_scans": "Total Scans",
                "blocked": "Threats Blocked",
                "safe": "Safe Confirmed",
                "accuracy": "ML Accuracy",
                "chart_title": "Scan Activity - 30 Days",
                "chart_sub": "Daily analysis count",
                "high_risk": "High Risk",
                "normal": "Normal",
                "days_ago": "30 days ago",
                "today": "Today",
                "breakdown": "Threat Breakdown",
                "recent": "Recent Scans (Real-Time)",
                "no_scans": "No scans recorded yet. Start scanning to see data here."
            }
        },
        "domain": {
            "vi": {
                "badge": "Intel Reconnaissance",
                "title": "Domain",
                "title_hl": "Lookup",
                "desc": "Tra cứu thông tin WHOIS, DNS và uy tín tên miền",
                "placeholder": "example.com",
                "lookup": "Lookup",
                "whois": "WHOIS Information",
                "ip_loc": "IP & Location"
            },
            "en": {
                "badge": "Intel Reconnaissance",
                "title": "Domain",
                "title_hl": "Lookup",
                "desc": "Lookup WHOIS, DNS, and domain reputation information",
                "placeholder": "example.com",
                "lookup": "Lookup",
                "whois": "WHOIS Information",
                "ip_loc": "IP & Location"
            }
        },
        "extension": {
            "vi": {
                "title": "PhishGuard",
                "title_hl": "Extension",
                "desc": "Bảo vệ trình duyệt của bạn trong thời gian thực. Tự động chặn các trang web độc hại trước khi bạn truy cập chúng.",
                "avail": "Available",
                "coming": "Coming Soon",
                "download": "Download",
                "guide_title": "Hướng dẫn cài đặt",
                "step1": "Tải file extension về máy",
                "step2": "Mở chrome://extensions",
                "step3": "Kéo thả file vào trình duyệt",
                "step4": "Hoàn tất - Bạn đã được bảo vệ"
            },
            "en": {
                "title": "PhishGuard",
                "title_hl": "Extension",
                "desc": "Protect your browser in real-time. Automatically block malicious websites before you access them.",
                "avail": "Available",
                "coming": "Coming Soon",
                "download": "Download",
                "guide_title": "Installation Guide",
                "step1": "Download the extension file",
                "step2": "Open chrome://extensions",
                "step3": "Drag and drop the file into the browser",
                "step4": "Done - You are protected"
            }
        },
        "qr": {
            "vi": {
                "badge": "QR Safety Shield",
                "title": "Quishing",
                "title_hl": "Scanner",
                "desc": "Phát hiện Quishing - tấn công lừa đảo nhúng URL độc hại vào mã QR",
                "stop": "Stop Camera",
                "start": "Start QR Scanner",
                "upload_alt": "Hoặc tải lên một tấm ảnh chứa mã QR để phân tích"
            },
            "en": {
                "badge": "QR Safety Shield",
                "title": "Quishing",
                "title_hl": "Scanner",
                "desc": "Detect Quishing - phishing attacks embedding malicious URLs in QR codes",
                "stop": "Stop Camera",
                "start": "Start QR Scanner",
                "upload_alt": "Or upload an image containing a QR code for analysis"
            }
        },
        "screenshot": {
            "vi": {
                "badge": "Visual AI Core",
                "title": "Screenshot",
                "title_hl": "Analyzer",
                "desc": "Phân tích giao diện web qua hình ảnh để phát hiện các dấu hiệu lừa đảo trực quan",
                "upload_title": "Tải lên ảnh chụp màn hình",
                "upload_desc": "Hỗ trợ các định dạng PNG, JPG, JPEG. Kích thước tối đa 10MB.",
                "select_file": "Chọn file từ máy tính",
                "loading": "Đang tải...",
                "f1_title": "OCR Extraction",
                "f1_desc": "Trích xuất văn bản từ hình ảnh để phân tích nội dung lừa đảo",
                "f2_title": "Logo Matching",
                "f2_desc": "Đối chiếu logo với ngân hàng dữ liệu các thương hiệu lớn",
                "f3_title": "DOM Reconstruction",
                "f3_desc": "Phỏng đoán cấu trúc HTML từ giao diện trực quan"
            },
            "en": {
                "badge": "Visual AI Core",
                "title": "Screenshot",
                "title_hl": "Analyzer",
                "desc": "Analyze web interfaces via images to detect visual phishing cues",
                "upload_title": "Upload a screenshot",
                "upload_desc": "Supports PNG, JPG, JPEG formats. Max size 10MB.",
                "select_file": "Select file from computer",
                "loading": "Loading...",
                "f1_title": "OCR Extraction",
                "f1_desc": "Extract text from images to analyze phishing content",
                "f2_title": "Logo Matching",
                "f2_desc": "Match logos against a database of major brands",
                "f3_title": "DOM Reconstruction",
                "f3_desc": "Infer HTML structure from visual interface"
            }
        },
        "education": {
            "vi": {
                "title": "Trung tâm",
                "title_hl": "Giáo dục",
                "title_end": "Bảo mật",
                "desc": "Tìm hiểu cách nhận diện các cuộc tấn công lừa đảo phổ biến.",
                "t1_title": "Kiểm tra tên miền",
                "t1_desc": "Kẻ tấn công dùng \"paypa1.com\" thay vì \"paypal.com\" - nhìn kỹ từng ký tự.",
                "t2_title": "URL rút gọn đáng ngờ",
                "t2_desc": "bit.ly, t.ly ẩn địa chỉ thật - luôn expand trước khi truy cập.",
                "t3_title": "Miền gửi giả mạo",
                "t3_desc": "Kiểm tra địa chỉ gửi thật - thường là \"support@paypa1.com\".",
                "t4_title": "Cảm giác cấp bách giả tạo",
                "t4_desc": "Sử dụng ngôn ngữ đe dọa như \"Tài khoản của bạn sẽ bị khóa trong 24h\"."
            },
            "en": {
                "title": "Security",
                "title_hl": "Education",
                "title_end": "Center",
                "desc": "Learn how to identify common phishing attacks.",
                "t1_title": "Check the domain",
                "t1_desc": "Attackers use \"paypa1.com\" instead of \"paypal.com\" - look closely at each character.",
                "t2_title": "Suspicious short URLs",
                "t2_desc": "bit.ly, t.ly hide the real address - always expand before visiting.",
                "t3_title": "Spoofed sender domains",
                "t3_desc": "Check the real sender address - often \"support@paypa1.com\".",
                "t4_title": "False sense of urgency",
                "t4_desc": "Using threatening language like \"Your account will be locked in 24h\"."
            }
        },
        "account": {
            "vi": {
                "badge": "Account Settings",
                "title": "User",
                "title_hl": "Account",
                "verified": "VERIFIED",
                "cancel": "Cancel",
                "edit": "Edit",
                "tab_profile": "Profile",
                "tab_security": "Security",
                "tab_notifications": "Notifications",
                "tab_usage": "Usage",
                "personal": "Personal Information",
                "save": "Save Changes",
                "saved": "Changes saved",
                "sec_settings": "Security Settings",
                "pass": "Change Password",
                "pass_sub": "Last changed: 30 days ago",
                "change": "Change",
                "tfa": "Two-Factor Auth (2FA)",
                "tfa_sub": "Status: Enabled",
                "manage": "Manage",
                "sessions": "Active Sessions",
                "sessions_sub": "2 devices logged in",
                "view": "View",
                "notif_pref": "Notification Preferences",
                "n1": "Threat Alerts",
                "n1_sub": "Notify on new phishing threats",
                "n2": "Weekly Report",
                "n2_sub": "Summary every Monday morning",
                "n3": "System Updates",
                "n3_sub": "New features and maintenance",
                "n4": "Account Alerts",
                "n4_sub": "Login from new device",
                "usage_stat": "Usage Statistics",
                "u1": "URLs Scanned",
                "u2": "Files Scanned",
                "u3": "Emails",
                "u4": "Reports",
                "api_usage": "API Usage — This Month"
            },
            "en": {
                "badge": "Account Settings",
                "title": "User",
                "title_hl": "Account",
                "verified": "VERIFIED",
                "cancel": "Cancel",
                "edit": "Edit",
                "tab_profile": "Profile",
                "tab_security": "Security",
                "tab_notifications": "Notifications",
                "tab_usage": "Usage",
                "personal": "Personal Information",
                "save": "Save Changes",
                "saved": "Changes saved",
                "sec_settings": "Security Settings",
                "pass": "Change Password",
                "pass_sub": "Last changed: 30 days ago",
                "change": "Change",
                "tfa": "Two-Factor Auth (2FA)",
                "tfa_sub": "Status: Enabled",
                "manage": "Manage",
                "sessions": "Active Sessions",
                "sessions_sub": "2 devices logged in",
                "view": "View",
                "notif_pref": "Notification Preferences",
                "n1": "Threat Alerts",
                "n1_sub": "Notify on new phishing threats",
                "n2": "Weekly Report",
                "n2_sub": "Summary every Monday morning",
                "n3": "System Updates",
                "n3_sub": "New features and maintenance",
                "n4": "Account Alerts",
                "n4_sub": "Login from new device",
                "usage_stat": "Usage Statistics",
                "u1": "URLs Scanned",
                "u2": "Files Scanned",
                "u3": "Emails",
                "u4": "Reports",
                "api_usage": "API Usage — This Month"
            }
        }
    }
}

vi_data["features"] = {}
en_data["features"] = {}

for module, langs in translations["features"].items():
    vi_data["features"][module] = langs["vi"]
    en_data["features"][module] = langs["en"]

with open(vi_path, 'w', encoding='utf-8') as f:
    json.dump(vi_data, f, ensure_ascii=False, indent=4)

with open(en_path, 'w', encoding='utf-8') as f:
    json.dump(en_data, f, ensure_ascii=False, indent=4)

print("JSONs updated successfully.")
