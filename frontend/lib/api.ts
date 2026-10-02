import { Dataset, DatasetSummary, ColumnStat, ChartConfig, Message, ImageAnalysisResponse, RAGMetadata } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export async function fetchDatasets(): Promise<Dataset[]> {
  const res = await fetch(`${API_BASE}/datasets`);
  if (!res.ok) throw new Error("Failed to fetch datasets");
  return res.json();
}

export async function loadDemoDataset(): Promise<Dataset> {
  const res = await fetch(`${API_BASE}/datasets/demo`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to initialize demo dataset");
  return res.json();
}

export async function uploadDatasetFile(file: File): Promise<Dataset> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/datasets/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Upload failed" }));
    throw new Error(errorData.detail || "Upload failed");
  }
  return res.json();
}

export async function fetchDatasetDetails(id: string): Promise<Dataset> {
  const res = await fetch(`${API_BASE}/datasets/${id}`);
  if (!res.ok) throw new Error("Failed to fetch dataset details");
  return res.json();
}

export async function fetchDatasetStatistics(id: string): Promise<{
  dataset_id: string;
  dataset_name: string;
  summary: DatasetSummary;
  columns: ColumnStat[];
}> {
  const res = await fetch(`${API_BASE}/datasets/${id}/statistics`);
  if (!res.ok) throw new Error("Failed to fetch statistics");
  return res.json();
}

export async function fetchDatasetCharts(id: string): Promise<{ charts: ChartConfig[] }> {
  const res = await fetch(`${API_BASE}/datasets/${id}/charts`);
  if (!res.ok) throw new Error("Failed to fetch charts");
  return res.json();
}

export async function fetchDatasetPreview(
  id: string,
  page = 1,
  pageSize = 25,
  search = "",
  sortBy?: string,
  sortDir: "asc" | "desc" = "asc"
): Promise<{
  columns: string[];
  rows: any[];
  total_records: number;
  page: number;
  page_size: number;
  total_pages: number;
}> {
  const params = new URLSearchParams({
    page: page.toString(),
    page_size: pageSize.toString(),
  });
  if (search) params.append("search", search);
  if (sortBy) {
    params.append("sort_by", sortBy);
    params.append("sort_dir", sortDir);
  }
  const res = await fetch(`${API_BASE}/datasets/${id}/preview?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to preview table data");
  return res.json();
}

export async function sendChatMessage(payload: {
  question: string;
  dataset_id?: string;
  conversation_id?: string;
  mode: "nlp" | "rag";
  language: "en" | "hi" | "kn";
}): Promise<{
  mode: "nlp" | "rag";
  question: string;
  answer: string;
  sql?: string;
  result?: any[];
  language: string;
  conversation_id: string;
  rag_metadata?: RAGMetadata | null;
}> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Chat error" }));
    throw new Error(err.detail || "Chat error");
  }
  return res.json();
}

export async function uploadImageFile(file: File): Promise<{ id: string; url: string; original_name: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/images/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Image upload failed");
  return res.json();
}

export async function analyzeImage(
  imageId: string,
  datasetId?: string,
  question?: string
): Promise<ImageAnalysisResponse> {
  const formData = new FormData();
  formData.append("image_id", imageId);
  if (datasetId) formData.append("dataset_id", datasetId);
  if (question) formData.append("question", question);

  const res = await fetch(`${API_BASE}/images/analyze`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Image analysis failed");
  return res.json();
}

export async function transcribeAudio(audioBlob: Blob, language = "en"): Promise<string> {
  const formData = new FormData();
  formData.append("file", audioBlob, "recording.webm");
  formData.append("language", language);

  const res = await fetch(`${API_BASE}/voice/transcribe`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Voice transcription failed");
  const data = await res.json();
  return data.text;
}

export async function fetchConversations(): Promise<{
  today: any[];
  yesterday: any[];
  earlier: any[];
}> {
  const res = await fetch(`${API_BASE}/conversations`);
  if (!res.ok) throw new Error("Failed to fetch conversations");
  return res.json();
}

export async function fetchConversationDetails(id: string): Promise<{
  id: string;
  title: string;
  messages: Message[];
}> {
  const res = await fetch(`${API_BASE}/conversations/${id}`);
  if (!res.ok) throw new Error("Failed to fetch conversation");
  return res.json();
}
