export type ChatMode = "nlp" | "rag";
export type Language = "en" | "hi" | "kn";

export interface ColumnStat {
  column_name: string;
  type: "numeric" | "categorical";
  unique_values: number;
  missing_values: number;
  missing_percentage: number;
  min?: number | null;
  max?: number | null;
  average?: number | null;
  median?: number | null;
  std_dev?: number | null;
  histogram?: Array<{ range: string; count: number }>;
  top_values?: Array<{ label: string; count: number }>;
  sample_values?: string[];
}

export interface DatasetSummary {
  total_rows: number;
  total_columns: number;
  numeric_columns: number;
  categorical_columns: number;
  total_missing_values: number;
  file_size_formatted?: string;
}

export interface Dataset {
  id: string;
  name: string;
  original_filename: string;
  file_type: string;
  row_count: number;
  column_count: number;
  file_size_bytes: number;
  is_demo?: boolean;
  created_at: string;
}

export interface ChartConfig {
  id: string;
  title: string;
  subtitle?: string;
  type: "bar" | "horizontal_bar" | "donut" | "line" | "area" | "scatter";
  xAxisKey?: string;
  yAxisKey?: string;
  dataKey?: string;
  nameKey?: string;
  color?: string;
  colors?: string[];
  data: any[];
}

export interface RAGChunk {
  rank: number;
  chunk_id: string;
  similarity_score: number;
  source: string;
  location: string;
  content: string;
  raw_data?: Record<string, any>;
}

export interface RAGFlowStep {
  step: number;
  name: string;
  desc: string;
}

export interface RAGMetadata {
  used_rag: boolean;
  used_duckdb?: boolean;
  session_id: string;
  query_id: string;
  timestamp: string;
  configuration: {
    embedding_model: string;
    vector_db: string;
    top_k: number;
    similarity_threshold: number;
  };
  summary: {
    chunks_retrieved: number;
    total_chunks_indexed: number;
    query: string;
  };
  flow: RAGFlowStep[];
  retrieved_chunks: RAGChunk[];
}

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  sql_query?: string | null;
  query_result?: any[] | null;
  dataset_name?: string | null;
  dataset_used?: string | null;
  rag_metadata?: RAGMetadata | null;
  mode?: ChatMode;
  language?: Language;
  created_at?: string;
  isStreaming?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  dataset_id?: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
}

export interface VisionAnalysis {
  identified_model?: string;
  confidence?: string;
  probable_manufacturer?: string;
  airframe_type?: string;
  landing_gear?: string;
  rotor_configuration?: string;
  visible_components?: string[];
  detailed_analysis?: string;
}

export interface ImageAnalysisResponse {
  image_id: string;
  vision_analysis: VisionAnalysis;
  dataset_correlation?: {
    query_cross_referenced: boolean;
    matching_fleet_candidates: Array<{
      helicopter_id: string;
      model: string;
      manufacturer: string;
      status: string;
      match_confidence: string;
    }>;
    summary: string;
  };
}
