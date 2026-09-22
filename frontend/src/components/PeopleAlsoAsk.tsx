import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Sparkles, ExternalLink, HelpCircle, BookOpen } from 'lucide-react';
import { SearchResultItem } from '../types';

interface QuestionAnswer {
  question: string;
  answer: string;
  sourceTitle: string;
  sourceUrl: string;
}

interface PeopleAlsoAskProps {
  query: string;
  topResult?: SearchResultItem | null;
  onOpenReader?: (item: SearchResultItem) => void;
}

export const PeopleAlsoAsk: React.FC<PeopleAlsoAskProps> = ({
  query,
  topResult,
  onOpenReader,
}) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0); // First open by default

  const generateQuestions = (q: string): QuestionAnswer[] => {
    const qLower = q.toLowerCase();

    if (qLower.includes('movie') || qLower.includes('film') || qLower.includes('cinema') || qLower.includes('show')) {
      return [
        {
          question: 'What is the highest-rated movie of 2026 on Tomatometer?',
          answer:
            'Critical consensus highlights films reaching Certified Fresh status with 95%+ ratings on Rotten Tomatoes, including breakthrough dramas, international releases, and celebrated festival premieres evaluated by verified critics.',
          sourceTitle: topResult?.title || 'Rotten Tomatoes Editorial Guide',
          sourceUrl: topResult?.url || 'https://editorial.rottentomatoes.com/guide/best-new-movies/',
        },
        {
          question: 'How are Rotten Tomatoes Tomatometer scores calculated?',
          answer:
            'The Tomatometer score represents the percentage of professional critic reviews that are positive. When at least 60% of reviews are positive, a red tomato is awarded. Films with consistent 75%+ scores and verified minimum review counts earn Certified Fresh certification.',
          sourceTitle: 'Rotten Tomatoes Verification System',
          sourceUrl: 'https://rottentomatoes.com/about',
        },
        {
          question: 'Where can I stream new release 2026 movies?',
          answer:
            'New releases typically debut in theatrical windows before arriving on major streaming platforms (Netflix, HBO Max, Apple TV+, Amazon Prime) within 45 to 90 days after premiere.',
          sourceTitle: 'Streaming Guide & Digital Release Windows',
          sourceUrl: topResult?.url || 'https://editorial.rottentomatoes.com',
        },
        {
          question: 'What is the difference between Critic Score and Popcornmeter?',
          answer:
            'The Tomatometer reflects accredited film critic reviews, while the Popcornmeter (Audience Score) measures verified audience ratings from everyday viewers who purchased tickets.',
          sourceTitle: 'Rotten Tomatoes Rating Metrics',
          sourceUrl: 'https://rottentomatoes.com/help',
        },
      ];
    }

    if (qLower.includes('nagar') || qLower.includes('palika') || qLower.includes('tax') || qLower.includes('municipal')) {
      return [
        {
          question: 'How to pay property tax online through the Nagarpalika portal?',
          answer:
            'Visit the Nagarpalika citizen services portal, select "Property Tax Assessment", enter your Assessment Number or Ward PIN, verify property ownership details, and complete payment via UPI or Net Banking to download your signed digital receipt.',
          sourceTitle: 'Nagarpalika Citizen E-Services',
          sourceUrl: 'https://nagarpalika.gov.in/services/property-tax',
        },
        {
          question: 'What documents are required for birth or death registration in Nagarpalika?',
          answer:
            'Required documents include the institutional birth/death slip issued by the hospital, ID proofs of parents/informant (Aadhaar or Voter ID), proof of address, and application form submitted within 21 days.',
          sourceTitle: 'Department of Vital Statistics & Records',
          sourceUrl: 'https://nagarpalika.gov.in/services/birth-death-registration',
        },
        {
          question: 'What is the role and constitutional mandate of a Nagarpalika?',
          answer:
            'Governed by the 74th Constitutional Amendment Act, a Nagarpalika administers urban infrastructure, sanitation, public healthcare, road maintenance, and local civic amenities for designated urban township councils.',
          sourceTitle: 'Ministry of Housing and Urban Affairs',
          sourceUrl: 'https://nagarpalika.gov.in',
        },
      ];
    }

    if (qLower.includes('search') || qLower.includes('hybrid') || qLower.includes('bm25') || qLower.includes('vector')) {
      return [
        {
          question: 'Why is Hybrid Search better than vector-only or keyword-only search?',
          answer:
            'Hybrid search combines the lexical precision of Okapi BM25 (exact keywords, acronyms, product SKUs) with dense vector embeddings (synonyms, semantics, contextual intent), preventing semantic drift and boosting Mean Reciprocal Rank by up to 30%.',
          sourceTitle: 'SmartSearch IR Architecture Paper',
          sourceUrl: 'https://smartsearch.ai/docs/hybrid-search-explained',
        },
        {
          question: 'How does Reciprocal Rank Fusion (RRF) work in search engines?',
          answer:
            'RRF merges disparate ranked lists by assigning each item a score equal to 1 / (k + rank). Because it relies on ordinal rank rather than uncalibrated raw scores, it cleanly fuses BM25 and Vector scores without complex manual weight tuning.',
          sourceTitle: 'Information Retrieval Principles',
          sourceUrl: 'https://smartsearch.ai/docs/rrf',
        },
        {
          question: 'What is Qdrant and how does it index high-dimensional vectors?',
          answer:
            'Qdrant is a Rust-based vector search engine that implements Hierarchical Navigable Small World (HNSW) graphs, offering sub-5ms nearest-neighbor lookups with payload filtering and SIMD acceleration.',
          sourceTitle: 'Qdrant Vector Database Documentation',
          sourceUrl: 'https://qdrant.tech/documentation',
        },
      ];
    }

    // Dynamic fallback for any general query
    const cleanTopic = q.trim();
    return [
      {
        question: `What are the most important facts about ${cleanTopic}?`,
        answer:
          topResult?.snippet ||
          `${cleanTopic} is indexed across live knowledge sources. Verified records from ${topResult?.domain || 'authoritative sources'} provide comprehensive overviews, historical context, and current developments.`,
        sourceTitle: topResult?.title || `${cleanTopic} Overview`,
        sourceUrl: topResult?.url || `https://en.wikipedia.org/wiki/${encodeURIComponent(cleanTopic.replace(/ /g, '_'))}`,
      },
      {
        question: `Where can I find authoritative information on ${cleanTopic}?`,
        answer:
          `Authoritative documentation and verified encyclopedic records are available via ${topResult?.domain || 'primary domain archives'} and public references with peer review.`,
        sourceTitle: topResult?.domain || 'Verified Knowledge Base',
        sourceUrl: topResult?.url || 'https://en.wikipedia.org',
      },
      {
        question: `How is ${cleanTopic} categorized and evaluated?`,
        answer:
          `Information retrieval algorithms rank ${cleanTopic} using hybrid semantic matching, lexical keyword density, and domain authority scoring to deliver top-relevance results.`,
        sourceTitle: 'SmartSearch Multi-Source Index',
        sourceUrl: topResult?.url || 'https://smartsearch.ai',
      },
    ];
  };

  const questions = generateQuestions(query);

  const toggleAccordion = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <div className="my-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/90 overflow-hidden shadow-sm transition-colors">
      {/* Header */}
      <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-950/40 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <HelpCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">People also ask</h3>
        </div>
        <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          Related Inquiries
        </span>
      </div>

      {/* Accordion Questions */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
        {questions.map((item, idx) => {
          const isExpanded = expandedIndex === idx;
          return (
            <div key={idx} className="transition-colors">
              <button
                onClick={() => toggleAccordion(idx)}
                className="w-full px-5 py-3.5 flex items-center justify-between text-left group hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition focus:outline-none"
              >
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors pr-4">
                  {item.question}
                </span>
                <span className="text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300 transition-transform">
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </span>
              </button>

              {isExpanded && (
                <div className="px-5 pb-4 pt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed space-y-3 bg-slate-50/60 dark:bg-slate-950/30 animate-in fade-in duration-200">
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                    {item.answer}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 dark:border-slate-800/60 text-[11px] text-slate-500 dark:text-slate-400">
                    <div className="flex items-center space-x-1.5 truncate max-w-[320px]">
                      <span className="text-slate-400 dark:text-slate-500">Source:</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300 truncate font-mono">
                        {item.sourceTitle}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      {topResult && onOpenReader && (
                        <button
                          onClick={() => onOpenReader(topResult)}
                          className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition"
                        >
                          <BookOpen className="w-3 h-3" />
                          <span>Peek</span>
                        </button>
                      )}
                      <a
                        href={item.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition"
                      >
                        <span>Visit</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
