BOT_NAME = "smartsearch_crawler"

SPIDER_MODULES = ["smartsearch_crawler.spiders"]
NEWSPIDER_MODULE = "smartsearch_crawler.spiders"

ROBOTSTXT_OBEY = True
CONCURRENT_REQUESTS = 8
DOWNLOAD_DELAY = 1.0

# AutoThrottle configuration
AUTOTHROTTLE_ENABLED = True
AUTOTHROTTLE_START_DELAY = 1.0
AUTOTHROTTLE_MAX_DELAY = 10.0
AUTOTHROTTLE_TARGET_CONCURRENCY = 2.0

USER_AGENT = "SmartSearchBot/1.0 (+http://localhost:8000/bot)"

ITEM_PIPELINES = {
    "smartsearch_crawler.pipelines.CleanTextPipeline": 100,
    "smartsearch_crawler.pipelines.SmartSearchIndexingPipeline": 300,
}

REQUEST_FINGERPRINTER_IMPLEMENTATION = "2.7"
TWISTED_REACTOR = "twisted.internet.asyncioreactor.AsyncioSelectorReactor"
FEED_EXPORT_ENCODING = "utf-8"
