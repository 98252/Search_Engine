from app.models.search_query import SearchQuery
from app.models.search_result import SearchResult

# Alias for backwards compatibility
QueryClick = SearchResult

__all__ = ["SearchQuery", "SearchResult", "QueryClick"]
