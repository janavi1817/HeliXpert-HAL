import {
  Dataset,
  DatasetSummary,
  ColumnStat,
  ChartConfig,
  Message,
  ImageAnalysisResponse,
  RAGMetadata,
  UploadResponse,
  AllDatasetsOverview,
  ChosenDataset,
  ChatMode,
  Language,
} from "./types";

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

export async function uploadDatasetFile(file: File): Promise<UploadResponse> {
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

export async function fetchAllDatasetsOverview(): Promise<AllDatasetsOverview> {
  const res = await fetch(`${API_BASE}/datasets/overview/all`);
  if (!res.ok) throw new Error("Failed to fetch all datasets overview");
  return res.json();
}

export async function fetchDatasetDetails(id: string): Promise<Dataset> {
  const res = await fetch(`${API_BASE}/datasets/${id}`);
  if (!res.ok) throw new Error("Failed to fetch dataset details");
  return res.json();
}

export async function deleteDataset(id: string): Promise<{ status: string; message: string }> {
  const res = await fetch(`${API_BASE}/datasets/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to delete dataset" }));
    throw new Error(errorData.detail || "Failed to delete dataset");
  }
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
  dataset_ids?: string[];
  image_id?: string;
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
  dataset_name?: string;
  dataset_used?: string;
  rag_metadata?: RAGMetadata | null;
  chosen_datasets?: ChosenDataset[] | null;
  vision_result?: any;
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

export async function fetchSuggestedPrompts(
  datasetId?: string,
  language: "en" | "hi" | "kn" = "en"
): Promise<string[]> {
  const targetId = datasetId || "none";
  try {
    const res = await fetch(`${API_BASE}/datasets/${targetId}/suggested-prompts?language=${language}`);
    if (res.ok) {
      const data = await res.json();
      if (data.prompts && data.prompts.length > 0) {
        return data.prompts;
      }
    }
  } catch {}

  if (language === "hi") {
    return [
      "प्रश्न पूछने के लिए डेटासेट अपलोड करें।",
      "एयरोस्पेस विश्लेषण देखने के लिए डेमो डेटासेट लोड करें।",
      "विज़न निरीक्षण के लिए विमान की छवि अपलोड करें。"
    ];
  } else if (language === "kn") {
    return [
      "ಪ್ರಶ್ನೆಗಳನ್ನು ಕೇಳಲು ಡೇಟಾಸೆಟ್ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ.",
      "ಏರೋಸ್ಪೇಸ್ ವಿಶ್ಲೇಷಣೆಗಾಗಿ ಡೆಮೊ ಡೇಟಾಸೆಟ್ ಲೋಡ್ ಮಾಡಿ.",
      "ವಿಷನ್ ತಪಾಸಣೆಗಾಗಿ ವಿಮಾನದ ಚಿತ್ರವನ್ನು ಅಪ್‌ಲೋಡ್ ಮಾಡಿ."
    ];
  }
  return [
    "Upload a dataset to start asking questions.",
    "Load the demo dataset to explore aerospace analytics.",
    "Upload an aircraft image for vision airframe inspection."
  ];
}

export async function fetchSpeechAudio(text: string, language: string = "en"): Promise<Blob | null> {
  const res = await fetch(`${API_BASE}/voice/speak`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, language }),
  });
  if (!res.ok) return null;
  // If backend signaled fallback to browser TTS
  if (res.headers.get("X-Use-Browser-TTS") === "true") {
    return null;
  }
  const blob = await res.blob();
  return blob.size > 100 ? blob : null;
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
  session_id: string;
  title: string;
  dataset_id?: string;
  mode?: ChatMode;
  datasets_used?: string[];
  created_at: string;
  updated_at: string;
  messages: Message[];
}> {
  const res = await fetch(`${API_BASE}/conversations/${id}`);
  if (!res.ok) throw new Error("Failed to fetch conversation");
  return res.json();
}

export async function deleteConversation(id: string): Promise<{ status: string; message: string }> {
  const res = await fetch(`${API_BASE}/conversations/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete conversation");
  return res.json();
}
