import os
import requests
from requests.exceptions import RequestException, Timeout
import logging
from typing import Dict

logger = logging.getLogger(__name__)


SIGHTENGINE_API_USER = os.getenv("88702856")
SIGHTENGINE_API_SECRET = os.getenv("2DAJCGQDRijUUbtfmQyBXXc92dL4wrqk")
SIGHTENGINE_API_URL = "https://api.sightengine.com/1.0/check.json"


if not SIGHTENGINE_API_USER or not SIGHTENGINE_API_SECRET:
    logger.warning("SIGHTENGINE_API_USER or SIGHTENGINE_API_SECRET is not set in environment variables!")


def check_image_sightengine(image_bytes: bytes, filename: str = "uploaded_image.jpg") -> Dict[str, str]:
    
    if not SIGHTENGINE_API_USER or not SIGHTENGINE_API_SECRET:
        logger.error("Missing Sightengine API credentials → cannot scan image")
        return {
            "status": "Error",
            "details": "Sightengine API credentials are not configured.",
            "color": "gray"
        }

    try:
        
        response = requests.post(
            SIGHTENGINE_API_URL,
            data={
                'models': 'nudity,wad,offensive,gore,text-content',  
                'api_user': SIGHTENGINE_API_USER,
                'api_secret': SIGHTENGINE_API_SECRET
            },
            files={'media': (filename, image_bytes)},
            timeout=15  
        )
        response.raise_for_status()

        result = response.json()
        logger.debug(f"Sightengine response for '{filename}': {result}")

        
        nudity_score = result.get("nudity", {}).get("raw", 0)
        offensive_prob = result.get("offensive", {}).get("prob", 0)
        gore_prob = result.get("gore", {}).get("prob", 0)

        
        if nudity_score > 0.5 or offensive_prob > 0.5 or gore_prob > 0.5:
            details_parts = []
            if nudity_score > 0.5:
                details_parts.append(f"Nudity (score: {nudity_score:.2f})")
            if offensive_prob > 0.5:
                details_parts.append(f"Offensive content (prob: {offensive_prob:.2f})")
            if gore_prob > 0.5:
                details_parts.append(f"Gore/violence (prob: {gore_prob:.2f})")

            return {
                "status": "Dangerous",
                "details": "Sensitive or inappropriate content detected: " + ", ".join(details_parts),
                "color": "red"
            }
        else:
            return {
                "status": "Safe",
                "details": "No sensitive or inappropriate content detected.",
                "color": "green"
            }

    except Timeout:
        logger.error(f"Timeout while scanning image '{filename}' with Sightengine")
        return {
            "status": "Error",
            "details": "Timeout connecting to Sightengine (possibly due to slow network).",
            "color": "orange"
        }
    except requests.exceptions.HTTPError as http_err:
        status_code = response.status_code if 'response' in locals() else None
        logger.error(f"HTTP error from Sightengine for image '{filename}': {http_err} (code: {status_code})")
        if status_code == 401:
            details = "Sightengine authentication failed (invalid API user/secret)."
        elif status_code == 429:
            details = "Sightengine rate limit exceeded."
        elif status_code == 400:
            details = "Invalid request (possibly bad image format or size)."
        else:
            details = f"HTTP error {status_code}: {response.text if 'response' in locals() else 'Unknown'}"
        return {
            "status": "Error",
            "details": details,
            "color": "gray"
        }
    except RequestException as req_err:
        logger.error(f"Connection/request error with Sightengine for image '{filename}': {req_err}")
        return {
            "status": "Error",
            "details": f"Connection error to Sightengine: {str(req_err)}",
            "color": "gray"
        }
    except Exception as e:
        logger.exception(f"Unexpected error while scanning image '{filename}' with Sightengine")
        return {
            "status": "Error",
            "details": "System error while scanning image with Sightengine.",
            "color": "gray"
        }