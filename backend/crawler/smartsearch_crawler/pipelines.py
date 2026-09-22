import re
from bs4 import BeautifulSoup
import httpx
from scrapy.exceptions import DropItem

class CleanTextPipeline:
    def process_item(self, item, spider):
        raw_html = item.get("raw_html", "")
        if not raw_html:
            raise DropItem("Empty HTML document.")

        soup = BeautifulSoup(raw_html, "html.parser")
        for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
            tag.decompose()

        cleaned = soup.get_text(separator=" ", strip=True)
        cleaned = re.sub(r'\s+', ' ', cleaned).strip()

        if len(cleaned.split()) < 25:
            raise DropItem(f"Insufficient text content ({len(cleaned.split())} words).")

        item["cleaned_text"] = cleaned
        return item


class SmartSearchIndexingPipeline:
    def open_spider(self, spider):
        self.api_url = getattr(spider, "api_url", "http://localhost:8000/api/v1/documents/index")

    def process_item(self, item, spider):
        # Post to indexing API endpoint
        payload = {
            "url": item["url"],
            "title": item.get("title", item["url"]),
            "content": item["cleaned_text"],
            "domain": item.get("domain")
        }
        try:
            with httpx.Client(timeout=10.0) as client:
                res = client.post(self.api_url, json=payload)
                if res.status_code in [200, 201]:
                    spider.logger.info(f"Successfully indexed {item['url']} via pipeline.")
                else:
                    spider.logger.warning(f"Indexing endpoint returned {res.status_code} for {item['url']}")
        except Exception as e:
            spider.logger.error(f"Error posting item to indexing endpoint: {e}")
        return item
