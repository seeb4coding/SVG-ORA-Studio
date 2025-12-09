
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export enum GenerationStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export interface GeneratedSvg {
  id: string;
  content: string;
  prompt: string;
  timestamp: number;
}

export interface ApiError {
  message: string;
  details?: string;
}

export type ModelProvider = 'google' | 'openrouter';

export interface ModelConfig {
  provider: ModelProvider;
  model: string;
  apiKey?: string; // Optional for Google (uses env), required for OpenRouter
}

export interface GenerationOptions {
  prompt: string;
  image?: string;
  color: string;
  theme: string;
  style: string;
  ratio: string;
  complexity: string;
  animated: boolean;
  stroke: string;
  negativePrompt: string;
  viewpoint?: string;
  mood?: string;
  designType?: string;
  modelConfig: ModelConfig; // Added config
}
