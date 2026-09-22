import re
import json
import asyncio
import urllib.parse
from typing import Dict, Any, List, Optional
import httpx
from bs4 import BeautifulSoup
import trafilatura
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

class ReaderService:
    """
    High-Performance Distraction-Free Article Reader Service.
    Extracts clean full-text article content, OpenGraph images, author metadata,
    and synthesized executive key points for any web page or Wikipedia article.
    """

    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._cache_max_size = 150

    def _get_domain(self, url: str) -> str:
        try:
            return urllib.parse.urlparse(url).netloc.replace("www.", "")
        except Exception:
            return "web"

    def _clean_text_paragraphs(self, text: str) -> List[str]:
        """Cleans and splits raw text into coherent, well-formed paragraphs."""
        raw_lines = text.split("\n")
        paragraphs: List[str] = []
        current_buf: List[str] = []

        for line in raw_lines:
            line_str = line.strip()
            if not line_str:
                if current_buf:
                    joined = " ".join(current_buf).strip()
                    if len(joined) > 30:
                        paragraphs.append(joined)
                    current_buf = []
                continue

            # Check if line is an image markdown ![caption](url)
            if line_str.startswith("![") and "](" in line_str:
                if current_buf:
                    paragraphs.append(" ".join(current_buf).strip())
                    current_buf = []
                paragraphs.append(line_str)
                continue

            # Heading-like line or bullet
            if line_str.startswith("#") or line_str.startswith("•") or line_str.startswith("- "):
                if current_buf:
                    paragraphs.append(" ".join(current_buf).strip())
                    current_buf = []
                paragraphs.append(line_str)
                continue

            current_buf.append(line_str)

        if current_buf:
            joined = " ".join(current_buf).strip()
            if len(joined) > 30:
                paragraphs.append(joined)

        return paragraphs

    def _extract_key_points(self, paragraphs: List[str], max_points: int = 5) -> List[str]:
        """Extracts the most salient, informative sentences as executive key takeaways."""
        points: List[str] = []
        for p in paragraphs:
            # Skip image or short lines
            if p.startswith("![") or len(p) < 40 or p.startswith("#"):
                continue
            
            # If paragraph contains list indicators or reviews
            if "Critics Consensus:" in p or "Synopsis:" in p or "Recommended:" in p:
                points.append(p)
                if len(points) >= max_points:
                    break
                continue

            # Split into sentences
            sentences = re.split(r"(?<=[.!?])\s+", p)
            for s in sentences:
                s_clean = s.strip()
                if 45 <= len(s_clean) <= 240 and not s_clean.startswith("http"):
                    points.append(s_clean)
                    break
            
            if len(points) >= max_points:
                break

        return points[:max_points]

    async def _fetch_wikipedia_article(self, url: str) -> Optional[Dict[str, Any]]:
        """Direct high-fidelity extraction for Wikipedia articles via MediaWiki API."""
        try:
            # Extract title from Wikipedia URL (e.g. /wiki/India -> India)
            parsed = urllib.parse.urlparse(url)
            path_parts = parsed.path.split("/wiki/")
            if len(path_parts) < 2:
                return None
            wiki_slug = path_parts[1]
            wiki_title = urllib.parse.unquote(wiki_slug).replace("_", " ")

            async with httpx.AsyncClient(timeout=4.0, headers=WIKI_HEADERS) as client:
                # 1. Summary API
                summary_resp = await client.get(
                    f"https://en.wikipedia.org/api/rest_v1/page/summary/{urllib.parse.quote(wiki_slug)}"
                )
                
                title = wiki_title
                excerpt = ""
                lead_image = None
                
                if summary_resp.status_code == 200:
                    sum_data = summary_resp.json()
                    title = sum_data.get("title", wiki_title)
                    excerpt = sum_data.get("extract", "")
                    lead_image = sum_data.get("originalimage", {}).get("source") or sum_data.get("thumbnail", {}).get("source")

                # 2. Extract sections & full body text
                extract_resp = await client.get(
                    "https://en.wikipedia.org/w/api.php",
                    params={
                        "action": "query",
                        "prop": "extracts",
                        "explaintext": "1",
                        "titles": wiki_title,
                        "format": "json"
                    }
                )

                paragraphs = []
                headings = []
                if extract_resp.status_code == 200:
                    pages = extract_resp.json().get("query", {}).get("pages", {})
                    for _, page_info in pages.items():
                        raw_extract = page_info.get("extract", "")
                        if raw_extract:
                            # Split into clean paragraphs
                            for block in raw_extract.split("\n\n"):
                                clean_b = block.strip()
                                if not clean_b:
                                    continue
                                if clean_b.startswith("==") and clean_b.endswith("=="):
                                    heading_name = clean_b.replace("=", "").strip()
                                    if heading_name.lower() not in ["see also", "references", "external links", "further reading"]:
                                        headings.append(heading_name)
                                        paragraphs.append(f"## {heading_name}")
                                elif len(clean_b) > 40:
                                    paragraphs.append(clean_b)

                if not paragraphs and excerpt:
                    paragraphs = [excerpt]

                word_count = sum(len(p.split()) for p in paragraphs)
                read_time = max(1, round(word_count / 200))
                key_points = self._extract_key_points(paragraphs, max_points=5)
                if not key_points and excerpt:
                    key_points = [excerpt]

                return {
                    "success": True,
                    "url": url,
                    "domain": "en.wikipedia.org",
                    "title": f"{title} - Wikipedia",
                    "author": "Wikipedia Contributors",
                    "published_date": "Updated Continuously",
                    "lead_image": lead_image,
                    "excerpt": excerpt or (paragraphs[0] if paragraphs else ""),
                    "word_count": word_count,
                    "read_time_minutes": read_time,
                    "paragraphs": paragraphs[:40], # Cap at 40 paragraphs for fast render
                    "headings": headings[:12],
                    "key_points": key_points,
                    "is_fallback": False,
                    "source": "wikipedia_api"
                }
        except Exception as e:
            logger.warning(f"Failed to fetch Wikipedia article for '{url}': {e}")
            return None

    def _sync_extract_trafilatura(self, html_content: str, url: str) -> Optional[Dict[str, Any]]:
        """Synchronous CPU worker for trafilatura extraction."""
        try:
            extracted_json = trafilatura.extract(
                html_content,
                url=url,
                output_format="json",
                include_images=True,
                include_links=False,
                include_tables=True,
                favor_precision=True
            )
            if not extracted_json:
                return None
            return json.loads(extracted_json)
        except Exception as e:
            logger.warning(f"Trafilatura extraction error for '{url}': {e}")
            return None

    async def get_reader_article(
        self,
        url: str,
        title_hint: str = "",
        snippet_hint: str = ""
    ) -> Dict[str, Any]:
        """
        Retrieves clean, full-article reader view.
        Uses in-memory caching and resilient multi-stage extraction.
        """
        clean_url = url.strip()
        if clean_url in self._cache:
            return self._cache[clean_url]

        domain = self._get_domain(clean_url)

        # 1. Specialized Wikipedia Handler
        if "wikipedia.org" in domain:
            wiki_res = await self._fetch_wikipedia_article(clean_url)
            if wiki_res:
                if len(self._cache) >= self._cache_max_size:
                    self._cache.pop(next(iter(self._cache)))
                self._cache[clean_url] = wiki_res
                return wiki_res

        # 2. General Live Web Article Extraction via Trafilatura & Metadata
        try:
            # Fetch HTML content via trafilatura.fetch_url with httpx fallback
            loop = asyncio.get_running_loop()
            html_content = await loop.run_in_executor(None, trafilatura.fetch_url, clean_url)
            if not html_content:
                async with httpx.AsyncClient(
                    timeout=5.0,
                    follow_redirects=True,
                    headers=BROWSER_HEADERS,
                    verify=False
                ) as client:
                    resp = await client.get(clean_url)
                    if resp.status_code == 200:
                        html_content = resp.text

            if not html_content:
                raise Exception(f"Failed to fetch content for {clean_url}")


            # Parse OpenGraph and Meta tags via BeautifulSoup
            soup = BeautifulSoup(html_content, "html.parser")
            og_title = None
            og_image = None
            og_desc = None
            author = None
            pub_date = None

            # OpenGraph tags
            og_title_tag = soup.find("meta", property="og:title") or soup.find("meta", attrs={"name": "twitter:title"})
            if og_title_tag:
                og_title = og_title_tag.get("content", "").strip()

            og_image_tag = soup.find("meta", property="og:image") or soup.find("meta", attrs={"name": "twitter:image"})
            if og_image_tag:
                og_image = og_image_tag.get("content", "").strip()

            og_desc_tag = soup.find("meta", property="og:description") or soup.find("meta", attrs={"name": "description"})
            if og_desc_tag:
                og_desc = og_desc_tag.get("content", "").strip()

            author_tag = soup.find("meta", attrs={"name": "author"}) or soup.find("meta", property="article:author")
            if author_tag:
                author = author_tag.get("content", "").strip()

            date_tag = soup.find("meta", property="article:published_time") or soup.find("time")
            if date_tag:
                pub_date = date_tag.get("datetime") or date_tag.get("content") or date_tag.get_text(strip=True)

            # Trafilatura extract in thread pool
            loop = asyncio.get_event_loop()
            traf_data = await loop.run_in_executor(
                None,
                self._sync_extract_trafilatura,
                html_content,
                clean_url
            )

            title = og_title or (traf_data.get("title") if traf_data else None) or title_hint or domain
            author = author or (traf_data.get("author") if traf_data else None) or domain
            pub_date = pub_date or (traf_data.get("date") if traf_data else None) or "Verified Web Record"
            lead_image = og_image or (traf_data.get("image") if traf_data else None)
            excerpt = og_desc or snippet_hint or ""

            raw_text = traf_data.get("text", "") if traf_data else ""
            paragraphs = self._clean_text_paragraphs(raw_text)

            # If trafilatura had very little text, try extracting main article paragraphs via BS4
            if len(paragraphs) < 2:
                article_elem = soup.find("article") or soup.find("main") or soup.find("div", class_=re.compile(r"content|post|entry|body", re.I))
                if article_elem:
                    p_tags = article_elem.find_all("p")
                    bs_paras = [p.get_text(strip=True) for p in p_tags if len(p.get_text(strip=True)) > 35]
                    if len(bs_paras) > len(paragraphs):
                        paragraphs = bs_paras

            # If still empty, use snippet hint
            if not paragraphs and snippet_hint:
                paragraphs = [snippet_hint]

            word_count = sum(len(p.split()) for p in paragraphs)
            read_time = max(1, round(word_count / 200))
            key_points = self._extract_key_points(paragraphs, max_points=6)
            if not key_points and excerpt:
                key_points = [excerpt]

            result = {
                "success": True,
                "url": clean_url,
                "domain": domain,
                "title": title,
                "author": author,
                "published_date": pub_date,
                "lead_image": lead_image,
                "excerpt": excerpt,
                "word_count": word_count,
                "read_time_minutes": read_time,
                "paragraphs": paragraphs[:50],
                "headings": [p.replace("##", "").strip() for p in paragraphs if p.startswith("## ")][:10],
                "key_points": key_points,
                "is_fallback": False,
                "source": "trafilatura_live"
            }

            if len(self._cache) >= self._cache_max_size:
                self._cache.pop(next(iter(self._cache)))
            self._cache[clean_url] = result
            return result

        except Exception as e:
            logger.warning(f"Could not scrape live reader text for '{clean_url}': {e}")
            # Graceful Fallback using hints
            clean_snippet = re.sub(r"<[^>]+>", "", snippet_hint)
            fallback_result = {
                "success": True,
                "url": clean_url,
                "domain": domain,
                "title": title_hint or domain,
                "author": domain,
                "published_date": "Online Resource",
                "lead_image": None,
                "excerpt": clean_snippet,
                "word_count": len(clean_snippet.split()) if clean_snippet else 40,
                "read_time_minutes": 1,
                "paragraphs": [
                    clean_snippet or f"Information extracted from {domain} regarding your search query.",
                    f"Direct source: {clean_url}"
                ],
                "headings": ["Overview"],
                "key_points": [clean_snippet] if clean_snippet else [f"Comprehensive guide from {domain}"],
                "is_fallback": True,
                "source": "fallback_snippet"
            }
            return fallback_result

reader_service = ReaderService()
