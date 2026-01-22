
export interface ProductDetails {
  platform: string;
  minPrice: string;
  urgency: string;
  delivery: string;
}

export interface AnalysisResult {
  fullAnalysis: string;
  marketUrls: { title: string; uri: string }[];
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  image: string;
  enhancedImage: string | null;
  details: ProductDetails;
  analysis: AnalysisResult;
}

export enum AppStep {
  UPLOAD = 'UPLOAD',
  DETAILS = 'DETAILS',
  ANALYZING = 'ANALYZING',
  RESULTS = 'RESULTS',
  HISTORY = 'HISTORY'
}

export interface GroundingChunk {
  web?: {
    title: string;
    uri: string;
  };
}
