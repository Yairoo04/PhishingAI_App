import base64
import logging
from typing import Optional, Dict, Any

from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

logger = logging.getLogger(__name__)


def capture_webpage_data(url: str, timeout: int = 15000, full_page: bool = False) -> Dict[str, Any]:
    """
    Renders the URL using Playwright headless browser and captures:
    - Base64 PNG screenshot (for Visual CNN model & display)
    - Raw HTML source content (for Web Content analysis)
    - Visible inner body text (for NLP/keyword analysis)
    - Response HTTP status code and final redirected URL.
    """
    result: Dict[str, Any] = {
        "screenshot_b64": None,
        "html_content": "",
        "inner_text": "",
        "status_code": None,
        "final_url": url,
        "success": False,
        "error": None
    }

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True,
                args=[
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-dev-shm-usage"
                ]
            )
            try:
                page = browser.new_page(viewport={"width": 1280, "height": 720})

                response = page.goto(
                    url,
                    wait_until="load",
                    timeout=timeout
                )

                if response is not None:
                    result["status_code"] = response.status
                    result["final_url"] = page.url
                    logger.info(f"Successfully loaded {url} with status code {response.status}")

                try:
                    page.wait_for_load_state("networkidle", timeout=3000)
                except PlaywrightTimeoutError:
                    pass

                page.wait_for_timeout(1000)

                # 1. Capture HTML & text
                try:
                    result["html_content"] = page.content()
                except Exception as html_err:
                    logger.warning(f"Could not get page content for {url}: {html_err}")

                try:
                    result["inner_text"] = page.inner_text("body")
                except Exception as text_err:
                    logger.warning(f"Could not get page inner text for {url}: {text_err}")

                # 2. Capture screenshot
                screenshot_bytes = page.screenshot(full_page=full_page, type="png")
                screenshot_base64 = base64.b64encode(screenshot_bytes).decode("utf-8")
                result["screenshot_b64"] = screenshot_base64
                result["success"] = True

                logger.debug(f"Webpage data captured for {url} (screenshot: {len(screenshot_base64)} chars, html: {len(result['html_content'])} chars)")
                return result

            except PlaywrightTimeoutError:
                logger.error(f"Timeout while loading URL: {url} (timeout={timeout}ms)")
                result["error"] = f"Timeout ({timeout}ms)"
                return result
            except Exception as page_err:
                logger.error(f"Error during page interaction for {url}: {page_err}")
                result["error"] = str(page_err)
                return result
            finally:
                browser.close()
                logger.debug("Browser instance closed")

    except Exception as e:
        logger.exception(f"Failed to capture webpage data for URL '{url}': {e}")
        result["error"] = str(e)
        return result


def get_screenshot_base64(url: str, timeout: int = 15000, full_page: bool = False) -> Optional[str]:
    """Backward-compatible helper returning screenshot base64 string."""
    res = capture_webpage_data(url, timeout=timeout, full_page=full_page)
    return res.get("screenshot_b64")