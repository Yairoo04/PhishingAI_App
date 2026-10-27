import sqlite3
import os
from datetime import datetime
import threading

# Use an absolute path for the DB file location
DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "database", "scans.db"))

# Thread local storage for sqlite connections
local = threading.local()

def get_db():
    if not hasattr(local, "conn"):
        # Create database directory if it doesn't exist
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
        local.conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        local.conn.row_factory = sqlite3.Row
    return local.conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS scan_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL,
            target TEXT NOT NULL,
            result TEXT NOT NULL,
            confidence REAL,
            icon TEXT,
            timestamp TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()

# Initialize upon module import
init_db()

def insert_scan(scan_type, target, result, confidence=0.0, icon="bx-search"):
    conn = get_db()
    cursor = conn.cursor()
    # Use ISO format for better JS compatibility
    iso_ts = datetime.now().isoformat()
    cursor.execute('''
        INSERT INTO scan_history (type, target, result, confidence, icon, timestamp)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (scan_type, target, result, confidence, icon, iso_ts))
    conn.commit()
    return cursor.lastrowid

def get_all_scans(limit=1000):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM scan_history ORDER BY timestamp DESC LIMIT ?', (limit,))
    rows = cursor.fetchall()
    
    # Convert rows to list of dicts for JSON
    result = []
    for row in rows:
        result.append({
            "id": row["id"],
            "type": row["type"],
            "target": row["target"],
            "result": row["result"],
            "confidence": row["confidence"],
            "icon": row["icon"],
            "time": row["timestamp"]
        })
    return result

def get_dashboard_stats():
    conn = get_db()
    cursor = conn.cursor()
    
    # 1. Total Scans
    cursor.execute('SELECT COUNT(*) as count FROM scan_history')
    total_scans = cursor.fetchone()["count"]
    
    # 2. Threats Blocked
    cursor.execute('''
        SELECT COUNT(*) as count FROM scan_history 
        WHERE LOWER(result) IN ('phishing', 'malware', 'malicious', 'dangerous', 'high_risk')
    ''')
    threats_blocked = cursor.fetchone()["count"]
    
    # 3. Safe Confirmed
    cursor.execute('''
        SELECT COUNT(*) as count FROM scan_history 
        WHERE LOWER(result) IN ('legitimate', 'safe')
    ''')
    safe_confirmed = cursor.fetchone()["count"]
    
    # 4. Threat Distribution (Group By Type)
    cursor.execute('''
        SELECT type, COUNT(*) as count FROM scan_history
        GROUP BY type
    ''')
    type_counts = {row["type"]: row["count"] for row in cursor.fetchall()}
    
    threat_distribution = {
        "url_phishing": type_counts.get("url", 0),
        "android_malware": type_counts.get("apk", 0),
        "email_scam": type_counts.get("email", 0),
        "pdf_exploit": type_counts.get("file", 0),
        "image_qr": type_counts.get("image", 0)
    }
    
    # 5. Accuracy (Hardcoded for now as requested, or dynamically set if user prefers)
    accuracy = 98.7 if total_scans > 0 else 0.0
    
    return {
        "total_scans": total_scans,
        "threats_blocked": threats_blocked,
        "safe_confirmed": safe_confirmed,
        "accuracy": accuracy,
        "threat_distribution": threat_distribution
    }
