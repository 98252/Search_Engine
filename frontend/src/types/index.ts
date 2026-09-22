export type SearchMode = 'hybrid' | 'semantic' | 'keyword';

export interface SearchResultItem {
  id: string;
  document_id: string;
  title: string;
  url: string;
  domain: string;
  snippet: string;
  content?: string;
  author?: string;
  hybrid_score: number;
  bm25_score?: number | null;
  vector_score?: number | null;
  rank: number;
}

export interface SearchResponse {
  success: boolean;
  query: string;
  mode: SearchMode;
  total_hits: number;
  page: number;
  page_size: number;
  execution_time_ms: number;
  results: SearchResultItem[];
  fallback_used?: string | null;
}

export interface CrawlJob {
  id: string;
  seed_url: string;
  allowed_domains?: string | null;
  status: 'pending' | 'running' | 'completed' | 'failed';
  pages_crawled: number;
  pages_indexed: number;
  depth_limit: number;
  max_pages: number;
  error_message?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  created_at: string;
}

export interface CrawlStats {
  total_jobs: number;
  active_jobs: number;
  total_pages_crawled: number;
  total_pages_indexed: number;
  recent_jobs: CrawlJob[];
}

export interface SystemTelemetry {
  overview: {
    total_documents: number;
    total_chunks: number;
    total_queries: number;
    avg_latency_ms: number;
  };
  top_queries: { query: string; count: number }[];
  search_engines: {
    opensearch: {
      status: string;
      document_count: number;
    };
    qdrant: {
      status: string;
      vector_count: number;
    };
  };
}

export interface User {
  id: string;
  email: string;
  full_name?: string | null;
  role: 'user' | 'admin';
  is_active: boolean;
  created_at: string;
}

export interface ReaderArticleData {
  success: boolean;
  url: string;
  domain: string;
  title: string;
  author?: string;
  published_date?: string;
  lead_image?: string | null;
  excerpt?: string;
  word_count: number;
  read_time_minutes: number;
  paragraphs: string[];
  headings: string[];
  key_points: string[];
  is_fallback?: boolean;
  source?: string;
}

export interface SearchHistoryItem {
  id: string;
  query: string;
  mode?: SearchMode | string;
  resultsCount?: number;
  timestamp: number;
  createdAtIso?: string;
}


