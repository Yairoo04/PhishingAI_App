import requests
import os
from requests.exceptions import RequestException, Timeout
import logging
from typing import Dict


SCANII_API_KEY = "sck_X6wNAo9OkCSpDuCd"
SCANII_API_SECRET = "scks_L0jRFha243m5VUXU4Le1msFPzQdrCqv6"
SCANII_API_URL = "https://api.scanii.com/v2.1/files"

logger = logging.getLogger(__name__)


if not SCANII_API_KEY or not SCANII_API_SECRET:
    logger.warning("SCANII_API_KEY or SCANII_API_SECRET is not set in environment variables!")


def check_scanii_from_file(file_bytes: bytes, filename: str = "uploaded_file") -> Dict[str, str]:
    
    if not SCANII_API_KEY or not SCANII_API_SECRET:
        logger.error("Missing Scanii API credentials → cannot scan file")
        return {
            "status": "Error",
            "details": "Scanii API credentials are not configured.",
            "color": "gray"
        }

    try:
        
        response = requests.post(
            SCANII_API_URL,
            auth=(SCANII_API_KEY, SCANII_API_SECRET),
            files={'file': (filename, file_bytes)},
            timeout=30  
        )
        response.raise_for_status()  

        result = response.json()

        
        if result.get("findings"):
            threats = ", ".join(finding.get("type", "Unknown") for finding in result["findings"])
            logger.warning(f"File '{filename}' flagged as dangerous: {threats}")
            return {
                "status": "Dangerous",
                "details": f"Detected: {threats}",
                "color": "red"
            }
        else:
            logger.info(f"File '{filename}' is clean according to Scanii")
            return {
                "status": "Safe",
                "details": "No threats detected.",
                "color": "green"
            }

    except Timeout:
        logger.error(f"Timeout while scanning file '{filename}' with Scanii")
        return {
            "status": "Error",
            "details": "Timeout connecting to Scanii (possibly due to slow network).",
            "color": "orange"
        }
    except requests.exceptions.HTTPError as http_err:
        status_code = response.status_code if 'response' in locals() else None
        logger.error(f"HTTP error from Scanii for file '{filename}': {http_err} (code: {status_code})")
        if status_code == 401:
            details = "Scanii authentication failed (invalid API key/secret)."
        elif status_code == 429:
            details = "Scanii rate limit exceeded."
        elif status_code == 400:
            details = "Invalid request (possibly bad file format)."
        else:
            details = f"HTTP error {status_code}: {response.text if 'response' in locals() else 'Unknown'}"
        return {
            "status": "Error",
            "details": details,
            "color": "gray"
        }
    except RequestException as req_err:
        logger.error(f"Connection/request error with Scanii for file '{filename}': {req_err}")
        return {
            "status": "Error",
            "details": f"Connection error to Scanii: {str(req_err)}",
            "color": "gray"
        }
    except Exception as e:
        logger.exception(f"Unexpected error while scanning file '{filename}' with Scanii")
        return {
            "status": "Error",
            "details": "System error while scanning file with Scanii.",
            "color": "gray"
        }