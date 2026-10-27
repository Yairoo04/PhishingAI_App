import os
import re
import socket
import logging
from datetime import datetime
import whois
import dns.resolver
import requests
from flask import Blueprint, request, jsonify

bp = Blueprint("domain", __name__)
logger = logging.getLogger(__name__)

def extract_valid_domain(input_str: str) -> str:
    """Extract and validate domain name from input URL/string."""
    # Remove protocol if present
    domain = re.sub(r"^https?://", "", input_str.strip().lower())
    # Remove path, query, fragment
    domain = domain.split("/")[0].split("?")[0].split("#")[0]
    
    # Basic domain regex validation
    if not re.match(r"^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$", domain):
        return None
    return domain

def calculate_risk_score(domain: str, whois_data: dict, dns_data: dict) -> tuple:
    """Calculate risk score and return (score, level)"""
    score = 0
    
    # 1. Suspicious TLD
    suspicious_tlds = {".zip", ".xyz", ".top", ".stream", ".gq", ".ml", ".cf", ".tk", ".ga"}
    if any(domain.endswith(tld) for tld in suspicious_tlds):
        score += 30

    # 2. Domain Age < 1 year
    try:
        if whois_data.get("created"):
            created_date = whois_data["created"]
            if isinstance(created_date, list):
                created_date = created_date[0]
            if isinstance(created_date, datetime):
                age_days = (datetime.now() - created_date).days
                if age_days < 365:
                    score += 25
                if age_days < 30:
                    score += 20  # Additional penalty for very new domains
    except Exception:
        pass # Ignore date parsing errors and assume no penalty for now

    # 3. Missing MX Record (Typical for throwaway phishing domains)
    if not dns_data.get("MX"):
        score += 15
        
    # 4. WHOIS Privacy (High likelihood in phishing, though common in legit too)
    registrar = str(whois_data.get("registrar", "")).lower()
    if "privacy" in registrar or "proxy" in registrar or "protected" in registrar:
        score += 10

    # Max score 100
    score = min(score, 100)
    
    if score <= 30:
        level = "Safe"
    elif score <= 60:
        level = "Suspicious"
    else:
        level = "High Risk"
        
    return score, level

def safe_datetime_str(dt) -> str:
    if isinstance(dt, list):
        dt = dt[0]
    if isinstance(dt, datetime):
        return dt.strftime("%Y-%m-%d")
    return str(dt) if dt else None

@bp.route("/lookup", methods=["POST"])
def lookup_domain():
    try:
        data = request.get_json()
        if not data or "domain" not in data:
            return jsonify({"error": "Missing 'domain' in request body"}), 400

        raw_domain = data["domain"]
        domain = extract_valid_domain(raw_domain)
        
        if not domain:
            logger.warning(f"Invalid domain lookup attempted: {raw_domain}")
            return jsonify({"error": "Invalid domain format"}), 400

        logger.info(f"Starting Domain Lookup for: {domain}")
        
        # STEP 2: WHOIS Lookup
        whois_result = {}
        try:
            w = whois.whois(domain)
            whois_result = {
                "registrar": w.registrar,
                "created": safe_datetime_str(w.creation_date),
                "expires": safe_datetime_str(w.expiration_date),
                "status": w.status if isinstance(w.status, str) else (w.status[0] if w.status else None)
            }
        except Exception as e:
            logger.error(f"WHOIS lookup failed for {domain}: {e}")
            whois_result = {"error": "WHOIS data unavailable"}

        # STEP 3: DNS Records
        dns_result = {"A": [], "MX": [], "NS": [], "TXT": []}
        resolver = dns.resolver.Resolver()
        resolver.timeout = 3
        resolver.lifetime = 3
        
        for record_type in ["A", "MX", "NS", "TXT"]:
            try:
                answers = resolver.resolve(domain, record_type)
                for rdata in answers:
                    dns_result[record_type].append(rdata.to_text().strip('"'))
            except Exception:
                pass # Normal if a specific record type doesn't exist

        # STEP 4: IP Resolution
        ip_address = None
        if dns_result["A"]:
            ip_address = dns_result["A"][0]
        else:
            try:
                ip_address = socket.gethostbyname(domain)
            except Exception:
                pass

        # STEP 5: IP Intelligence
        ip_result = {}
        if ip_address:
            try:
                # http://ip-api.com/json/{ip} is free for non-commercial use, no auth needed
                resp = requests.get(f"http://ip-api.com/json/{ip_address}", timeout=5)
                if resp.status_code == 200:
                    ip_data = resp.json()
                    if ip_data.get("status") == "success":
                        ip_result = {
                            "address": ip_address,
                            "asn": f"{ip_data.get('as', '')}".split(' ')[0], # Just the AS number, e.g., AS15133
                            "organization": ip_data.get("isp") or ip_data.get("org"),
                            "city": ip_data.get("city"),
                            "country": ip_data.get("country")
                        }
            except Exception as e:
                logger.error(f"IP intelligence failed for {ip_address}: {e}")
                ip_result = {"address": ip_address, "error": "IP Intelligence unavailable"}
        
        if not ip_result and ip_address:
             ip_result = {"address": ip_address}

        # STEP 6: Risk Scoring
        w_raw = w if 'w' in locals() else {}
        risk_score, risk_level = calculate_risk_score(domain, w_raw, dns_result)

        # STEP 7: API Response
        return jsonify({
            "domain": domain,
            "whois": whois_result,
            "dns": dns_result,
            "ip": ip_result,
            "risk_score": risk_score,
            "risk_level": risk_level
        }), 200

    except Exception as e:
        logger.exception("Domain lookup encountered an unexpected error")
        return jsonify({"error": "An unexpected error occurred during analysis"}), 500
