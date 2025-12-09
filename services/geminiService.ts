
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI } from "@google/genai";
import { GenerationOptions, ModelConfig } from "../types";

// Initialize the Google client
// CRITICAL: We use process.env.API_KEY as per strict guidelines.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// System Instructions - Shared between providers
const getSystemPrompt = (options: GenerationOptions) => `
      You are a world-class expert in Scalable Vector Graphics (SVG) design and coding. 
      Your task is to generate a high-quality, visually stunning, and detailed SVG based on the user's description.
      
      Guidelines:
      1.  **Output Format**: Return ONLY the raw SVG code. Do not wrap it in markdown code blocks.
      2.  **Style**: The artistic style must be strictly: "${options.style}".
      3.  **Composition**:
          - Viewpoint: "${options.viewpoint || 'Optimized for subject'}".
          - Mood/Vibe: "${options.mood || 'Neutral'}".
      4.  **Color Palette**: 
          - Primary Color: "${options.color}". 
          - Theme/Harmony: "${options.theme}". Use this to select complementary or analogous colors.
      5.  **Stroke/Line Work**: "${options.stroke}".
      6.  **Complexity**: The level of detail should be: "${options.complexity}".
          - Minimal: Use few paths, simple shapes, abstract.
          - Medium: Balanced detail, standard iconography.
          - Detailed: Intricate paths, shading, texture, complex geometry.
      7.  **Animation**: ${options.animated ? "You MUST include CSS keyframe animations (`<style>`) or SMIL animations (`<animate>`) to bring the artwork to life. Make it loop smoothly." : "Do NOT include any animations. Static vector art only."}
      8.  **Negative Prompt**: Avoid these elements: "${options.negativePrompt}".
      9.  **Technical**: 
          - Always include a \`viewBox\` attribute that matches the requested aspect ratio: "${options.ratio}".
          - Ensure the SVG is self-contained.
          - Use semantic IDs or classes if helpful.
          - Do not use external resources (images/fonts).
      10. **Space Usage**: IMPORTANT: The artwork should completely fill the specified viewBox. Minimize empty margins around the subject.
`;

/**
 * Handles OpenRouter API calls
 */
const generateOpenRouterSvg = async (
    messages: any[], 
    config: ModelConfig
): Promise<string> => {
    if (!config.apiKey) throw new Error("OpenRouter API Key is missing. Please check settings.");

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${config.apiKey}`,
                "HTTP-Referer": window.location.origin,
                "X-Title": "SVG ORA Studio",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: config.model || "google/gemini-2.0-flash-exp:free",
                messages: messages
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || "OpenRouter API request failed");
        }

        const result = await response.json();
        return cleanSvgResponse(result.choices?.[0]?.message?.content);
    } catch (error: any) {
        console.error("OpenRouter Error:", error);
        throw new Error(error.message || "Failed to contact OpenRouter.");
    }
};


/**
 * Generates an SVG string based on the user's prompt and settings.
 */
export const generateSvgFromPrompt = async (options: GenerationOptions): Promise<string> => {
  const { modelConfig } = options;
  const systemPrompt = getSystemPrompt(options);
  const fullPrompt = `Create an ${options.animated ? 'ANIMATED' : ''} SVG representation of: "${options.prompt}". \nStyle: ${options.style}.\nViewpoint: ${options.viewpoint}.\nMood: ${options.mood}.\nColor Theme: ${options.theme} (Base: ${options.color}).\nStroke Style: ${options.stroke}.\nAspect Ratio: ${options.ratio}.\nComplexity: ${options.complexity}.\nNegative Prompt: ${options.negativePrompt}`;

  // Route based on provider
  if (modelConfig.provider === 'openrouter') {
      return generateOpenRouterSvg([
          { role: 'system', content: systemPrompt },
          { role: 'user', content: fullPrompt }
      ], modelConfig);
  }

  // Default: Google Gemini SDK
  try {
    const response = await ai.models.generateContent({
      model: modelConfig.model || 'gemini-3-pro-preview',
      contents: fullPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.4,
        topP: 0.95,
        topK: 40,
      },
    });

    return cleanSvgResponse(response.text);

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(error.message || "Failed to generate SVG.");
  }
};

/**
 * Generates an SVG based on an input image and settings.
 */
export const generateSvgFromImage = async (options: GenerationOptions): Promise<string> => {
  const { image, prompt, modelConfig } = options;
  if (!image) throw new Error("No image provided");

  const systemPrompt = `
      You are an expert in vectorizing images. Convert the provided image into a clean, high-quality Scalable Vector Graphic (SVG).
      
      Guidelines:
      1.  **Output**: Return ONLY the raw SVG code. No markdown.
      2.  **Fidelity**: Capture the essence, shapes, and composition of the source image.
      3.  **Style Adaptation**: Apply the requested style: "${options.style}".
      4.  **Composition**: Viewpoint: "${options.viewpoint || 'Match source'}", Mood: "${options.mood || 'Match source'}".
      5.  **Color**: The output should adhere to the primary color "${options.color}" and theme "${options.theme}" while respecting the image's original contrast if needed.
      6.  **Complexity**: Target complexity level: "${options.complexity}".
      7.  **Line Work**: Apply stroke style: "${options.stroke}".
      8.  **Animation**: ${options.animated ? "Include subtle animations." : "Static SVG only."}
      9.  **Technical**: Ensure valid XML, viewBox="${options.ratio}", and self-contained paths.
      10. **Space Usage**: Ensure the subject occupies the majority of the canvas with minimal whitespace.
    `;
  
  const userPromptText = `Convert this image to SVG. ${prompt ? `Additional instructions: ${prompt}` : ''} \nStyle: ${options.style}.\nViewpoint: ${options.viewpoint}.\nMood: ${options.mood}.\nTheme: ${options.theme}.\nComplexity: ${options.complexity}.\nNegative Prompt: ${options.negativePrompt}`;

  // OpenRouter Image Handling
  if (modelConfig.provider === 'openrouter') {
      // Ensure the model supports vision (e.g., gpt-4o, gemini-flash, etc.)
      return generateOpenRouterSvg([
          { role: 'system', content: systemPrompt },
          { 
              role: 'user', 
              content: [
                  { type: 'text', text: userPromptText },
                  { type: 'image_url', image_url: { url: image } }
              ]
          }
      ], modelConfig);
  }

  // Google Gemini SDK Handling
  try {
    // Remove data URL prefix if present (e.g., "data:image/png;base64,")
    const base64Data = image.split(',')[1] || image;
    const mimeType = image.match(/data:([^;]+);/)?.[1] || 'image/png';

    const response = await ai.models.generateContent({
      model: modelConfig.model || 'gemini-3-pro-preview',
      contents: [
        { text: userPromptText },
        {
            inlineData: {
                mimeType: mimeType,
                data: base64Data
            }
        }
      ],
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.4,
      },
    });

    return cleanSvgResponse(response.text);

  } catch (error: any) {
    console.error("Gemini Vision API Error:", error);
    throw new Error(error.message || "Failed to convert image to SVG.");
  }
};

/**
 * Refines an existing SVG based on user instructions.
 */
export const refineSvg = async (
  currentSvg: string,
  instruction: string,
  modelConfig: ModelConfig
): Promise<string> => {
    
  const systemPrompt = `
      You are an expert SVG editor. 
      Your task is to modify an existing SVG code based strictly on the user's instruction.
      
      Guidelines:
      1.  **Output Format**: Return ONLY the full, valid, updated SVG code. No markdown.
      2.  **Goal**: Implement the user's requested change while preserving the original style and quality as much as possible, unless asked to change it.
      3.  **Integrity**: Ensure the code remains valid XML/SVG.
  `;

  const fullPrompt = `
      Here is the original SVG code:
      \`\`\`xml
      ${currentSvg}
      \`\`\`

      User Instruction: "${instruction}"

      Return the updated SVG.
  `;

  if (modelConfig.provider === 'openrouter') {
      return generateOpenRouterSvg([
          { role: 'system', content: systemPrompt },
          { role: 'user', content: fullPrompt }
      ], modelConfig);
  }

  try {
    const response = await ai.models.generateContent({
      model: modelConfig.model || 'gemini-3-pro-preview',
      contents: fullPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.3, // Lower temperature for precise editing
      },
    });

    return cleanSvgResponse(response.text);

  } catch (error: any) {
    console.error("Gemini API Refine Error:", error);
    throw new Error(error.message || "Failed to refine SVG.");
  }
}

/**
 * Helper to clean up markdown from response
 */
function cleanSvgResponse(rawText: string | undefined): string {
  if (!rawText) return '';
  
  // 1. Remove markdown code blocks to clean up the string
  let text = rawText.replace(/```xml/gi, '').replace(/```svg/gi, '').replace(/```/g, '');

  // 2. Find the start of the SVG tag
  const start = text.search(/<svg/i);
  
  if (start !== -1) {
    // 3. Find the last closing SVG tag to handle nested SVGs correctly
    const lastEnd = text.toLowerCase().lastIndexOf('</svg>');
    
    if (lastEnd !== -1 && lastEnd > start) {
      // Extract everything from start to end + length of closing tag
      return text.substring(start, lastEnd + 6).trim();
    }
    
    // Fallback: If no closing tag found, return from start (best effort)
    return text.substring(start).trim();
  }

  // If no <svg> tag found, return stripped text
  return text.trim();
}