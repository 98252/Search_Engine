# SmartSearch AI: Technical Architecture Deep-Dive

SmartSearch AI is designed with an emphasis on **clean modularity**, **fault tolerance**, and **hybrid retrieval accuracy**. This document provides an in-depth breakdown of the technical components, mathematical foundations, and design tradeoffs.

---

## 1. Hybrid Search & Reciprocal Rank Fusion (RRF)

### The Retrieval Dilemma
Search engines face a fundamental tradeoff:
- **Lexical BM25** excels at precise keyword matches, acronyms, part numbers, and proper nouns, but struggles with synonyms and conceptual intent.
- **Dense Vector Search (Cosine on Embeddings)** excels at natural language intent, paraphrasing, and thematic relevance, but can miss rare exact words or fail when semantic similarity does not equal relevance.

### Why Not Score Normalization?
Raw scores from BM25 ($[0, \infty)$) and Cosine Similarity ($[-1, 1]$ or $[0, 1]$) have entirely different distributions and variances. Attempting a linear combination:
$$\text{Score} = \alpha \cdot \text{BM25} + (1-\alpha) \cdot \text{Cosine}$$
leads to distortion because BM25 scores vary wildly depending on document length and query rarity.

### The Reciprocal Rank Fusion Solution
RRF eliminates the score calibration problem by ranking documents based on **relative position** in each retrieved list:

$$RRF\_Score(d) = \sum_{m \in M} \frac{w_m}{k + \text{Rank}_m(d)}$$

Where:
- $M = \{\text{OpenSearch BM25}, \text{Qdrant Vector}\}$
- $k = 60$ is a dampening constant that mitigates the impact of top-rank outliers.
- $w_m = 0.5$ provides balanced weighting between keyword precision and semantic depth.
- If document $d$ ranks #1 in BM25 and #2 in Vector:
  $$RRF\_Score = \frac{0.5}{60 + 1} + \frac{0.5}{60 + 2} = \frac{0.5}{61} + \frac{0.5}{62} \approx 0.0082 + 0.00806 = 0.01626$$

---

## 2. Text Segmentation & Chunking Strategy

Documents crawled from the web or uploaded manually are segmented using a **recursive character boundary splitter**:
- **Target Chunk Size**: 1,200 characters (~300-400 words).
- **Chunk Overlap**: 200 characters (~50 words).
- **Boundary Priority**: Paragraph break (`\n`) $\rightarrow$ Sentence boundary (`. `, `? `, `! `) $\rightarrow$ Word boundary (` `).

This ensures:
1. Embeddings remain focused on specific semantic propositions rather than diluting over long multi-topic web pages.
2. Context is preserved across chunk transitions via the sliding window overlap.
3. OpenSearch highlight snippets map cleanly to exact matched chunks.

---

## 3. High-Throughput Web Crawler & Ingestion Pipeline

The web crawling engine is built on **Scrapy** and an asynchronous in-process crawler:
- **Rate-Limiting & Etiquette**: Implements `AutoThrottle` with an adaptive delay of 1.0s to 10.0s and respects `robots.txt`.
- **HTML Sanitization**: Decomposes `<script>`, `<style>`, `<nav>`, `<footer>`, `<aside>`, and `<header>` tags, preserving only high-value main content.
- **Deduplication**: Hashes the sanitized article text with SHA-256; duplicate URLs or identical content are detected and updated rather than duplicated.

---

## 4. Fault Tolerance & Graceful Degradation

SmartSearch AI is engineered to survive partial infrastructure failures:
- If **Qdrant** is temporarily offline, the search coordinator automatically falls back to **OpenSearch BM25**.
- If **OpenSearch** is unreachable, it automatically falls back to **Qdrant Dense Vector Search**.
- If running locally without Docker, an internal in-memory BM25 index and local disk Qdrant storage automatically activate, ensuring the application runs out-of-the-box.
