import re
import uuid
import asyncio
import urllib.parse
from typing import List, Dict, Any, Optional
import httpx
from bs4 import BeautifulSoup
from app.core.logging import logger

BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

WIKI_HEADERS = {
    "User-Agent": "SmartSearchEngine/1.0 (https://smartsearch.ai; contact@smartsearch.ai)"
}

class WebSearchProvider:
    """
    Live multi-source Web Search Provider.
    Enables SmartSearch to search the live web for any topic in the world,
    combining DuckDuckGo live web scraping and Wikipedia Open APIs.
    """

    async def search_duckduckgo(self, query: str, limit: int = 12) -> List[Dict[str, Any]]:
        """Scrapes DuckDuckGo HTML for real-time web results."""
        results: List[Dict[str, Any]] = []
        try:
            async with httpx.AsyncClient(timeout=6.0, follow_redirects=True) as client:
                resp = await client.post(
                    "https://html.duckduckgo.com/html/",
                    data={"q": query},
                    headers=BROWSER_HEADERS
                )
                if resp.status_code != 200:
                    logger.warning(f"DuckDuckGo returned status {resp.status_code}")
                    return results

                soup = BeautifulSoup(resp.text, "html.parser")
                items = soup.select(".result")

                for item in items:
                    title_elem = item.select_one(".result__title a.result__a")
                    snippet_elem = item.select_one(".result__snippet")

                    if not title_elem:
                        continue

                    title = title_elem.get_text(strip=True)
                    snippet = snippet_elem.get_text(strip=True) if snippet_elem else ""
                    raw_href = title_elem.get("href", "")

                    # Extract actual target destination URL from DuckDuckGo redirect wrapper
                    target_url = raw_href
                    try:
                        parsed = urllib.parse.urlparse(raw_href)
                        qs = urllib.parse.parse_qs(parsed.query)
                        if "uddg" in qs and qs["uddg"]:
                            target_url = qs["uddg"][0]
                    except Exception:
                        pass

                    domain = urllib.parse.urlparse(target_url).netloc or "web"

                    # Skip internal DDG ads / empty results
                    if "duckduckgo.com" in domain or not title:
                        continue

                    results.append({
                        "id": str(uuid.uuid4()),
                        "document_id": f"web_{uuid.uuid4().hex[:12]}",
                        "title": title,
                        "url": target_url,
                        "domain": domain,
                        "snippet": snippet,
                        "content": f"{title}\n\n{snippet}",
                        "author": domain,
                        "source": "live_web",
                        "score": 0.85
                    })

                    if len(results) >= limit:
                        break

        except Exception as e:
            logger.warning(f"Error fetching DuckDuckGo results for '{query}': {e}")

        return results

    async def search_wikipedia(self, query: str, limit: int = 4) -> List[Dict[str, Any]]:
        """Queries Wikipedia API for encyclopedic articles and extracts."""
        results: List[Dict[str, Any]] = []
        try:
            async with httpx.AsyncClient(timeout=4.0, follow_redirects=True) as client:
                resp = await client.get(
                    "https://en.wikipedia.org/w/api.php",
                    params={
                        "action": "query",
                        "list": "search",
                        "srsearch": query,
                        "format": "json",
                        "utf8": "1"
                    },
                    headers=WIKI_HEADERS
                )
                if resp.status_code != 200:
                    return results

                data = resp.json()
                search_hits = data.get("query", {}).get("search", [])

                for hit in search_hits[:limit]:
                    wiki_title = hit.get("title", "")
                    raw_snippet = hit.get("snippet", "")
                    clean_snippet = re.sub(r"<[^>]+>", "", raw_snippet).replace("&quot;", '"')
                    page_url = f"https://en.wikipedia.org/wiki/{urllib.parse.quote(wiki_title.replace(' ', '_'))}"

                    results.append({
                        "id": str(uuid.uuid4()),
                        "document_id": f"wiki_{hit.get('pageid', uuid.uuid4().hex[:8])}",
                        "title": f"{wiki_title} - Wikipedia",
                        "url": page_url,
                        "domain": "en.wikipedia.org",
                        "snippet": clean_snippet,
                        "content": f"{wiki_title}\n\n{clean_snippet}",
                        "author": "Wikipedia Encyclopedia",
                        "source": "wikipedia",
                        "score": 0.90
                    })

        except Exception as e:
            logger.warning(f"Error querying Wikipedia for '{query}': {e}")

        return results

    async def get_live_suggestions(self, query: str, limit: int = 6) -> List[str]:
        """Provides instant real-time suggestions across any topic using Wikipedia OpenSearch."""
        suggestions: List[str] = []
        if not query.strip() or len(query.strip()) < 2:
            return suggestions

        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                resp = await client.get(
                    "https://en.wikipedia.org/w/api.php",
                    params={
                        "action": "opensearch",
                        "search": query.strip(),
                        "limit": limit,
                        "format": "json"
                    },
                    headers=WIKI_HEADERS
                )
                if resp.status_code == 200:
                    data = resp.json()
                    if len(data) > 1 and isinstance(data[1], list):
                        suggestions = data[1][:limit]
        except Exception:
            pass

        return suggestions

    async def search_live_web(self, query: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Concurrently searches DuckDuckGo and Wikipedia, fusing and deduplicating."""
        ddg_task = self.search_duckduckgo(query, limit=limit)
        wiki_task = self.search_wikipedia(query, limit=5)

        ddg_res, wiki_res = await asyncio.gather(ddg_task, wiki_task)

        combined: List[Dict[str, Any]] = []
        seen_urls = set()

        # Prioritize top Wikipedia hit if relevant
        for item in wiki_res[:2]:
            if item["url"] not in seen_urls:
                seen_urls.add(item["url"])
                combined.append(item)

        for item in ddg_res:
            if item["url"] not in seen_urls:
                seen_urls.add(item["url"])
                combined.append(item)

        for item in wiki_res[2:]:
            if item["url"] not in seen_urls:
                seen_urls.add(item["url"])
                combined.append(item)

        return combined[:limit]

web_search_provider = WebSearchProvider()
