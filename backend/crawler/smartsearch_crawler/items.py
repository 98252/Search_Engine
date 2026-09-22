import scrapy

class ScrapedPageItem(scrapy.Item):
    url = scrapy.Field()
    domain = scrapy.Field()
    title = scrapy.Field()
    raw_html = scrapy.Field()
    cleaned_text = scrapy.Field()
    crawl_job_id = scrapy.Field()
