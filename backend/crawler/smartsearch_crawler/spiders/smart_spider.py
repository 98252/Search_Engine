from urllib.parse import urlparse
import scrapy
from smartsearch_crawler.items import ScrapedPageItem

class SmartSpider(scrapy.Spider):
    name = "smart_spider"

    def __init__(self, seed_url=None, allowed_domains=None, max_pages=30, *args, **kwargs):
        super(SmartSpider, self).__init__(*args, **kwargs)
        self.start_urls = [seed_url] if seed_url else ["https://en.wikipedia.org/wiki/Information_retrieval"]
        if allowed_domains:
            self.allowed_domains = [d.strip() for d in allowed_domains.split(",")]
        else:
            self.allowed_domains = [urlparse(self.start_urls[0]).netloc]
        self.max_pages = int(max_pages)
        self.page_count = 0

    def parse(self, response):
        if self.page_count >= self.max_pages:
            return

        self.page_count += 1
        title = response.xpath("//title/text()").get(default=response.url).strip()

        item = ScrapedPageItem()
        item["url"] = response.url
        item["domain"] = urlparse(response.url).netloc
        item["title"] = title
        item["raw_html"] = response.text
        yield item

        # Follow links
        if self.page_count < self.max_pages:
            for next_page in response.css("a::attr(href)").getall():
                if next_page and not next_page.startswith("#") and not next_page.startswith("mailto:"):
                    yield response.follow(next_page, callback=self.parse)
