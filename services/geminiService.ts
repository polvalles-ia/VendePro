
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { ProductDetails, AnalysisResult, GroundingChunk } from "../types";

// Helper function to analyze product listings using search grounding and reasoning models
export const analyzeProductListing = async (
  base64Image: string,
  details: ProductDetails
): Promise<AnalysisResult> => {
  // Always create a new GoogleGenAI instance right before making an API call
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const marketPrompt = `Investiga el mercado actual para el producto mostrado en la imagen. 
  Buscamos precios actuales en Wallapop, Vinted y Milanuncios en España. 
  Detalles del usuario: Venderá en ${details.platform}, precio mínimo aceptable ${details.minPrice}€, urgencia: ${details.urgency}, entrega: ${details.delivery}.
  Identifica el rango de precios reales de venta reciente.`;

  const marketResponse = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      {
        parts: [
          { inlineData: { data: base64Image, mimeType: 'image/jpeg' } },
          { text: marketPrompt }
        ]
      }
    ],
    config: {
      tools: [{ googleSearch: {} }]
    }
  });

  const groundingChunks = marketResponse.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const marketUrls = (groundingChunks as GroundingChunk[])
    .filter(chunk => chunk.web)
    .map(chunk => ({ title: chunk.web!.title, uri: chunk.web!.uri }));

  const analysisPrompt = `
    Actúa como un experto en marketing de segunda mano. Analiza esta imagen y los datos de mercado adjuntos para crear el anuncio perfecto.
    
    DATOS DE MERCADO ENCONTRADOS:
    ${marketResponse.text}
    
    DATOS DEL USUARIO:
    - Plataforma: ${details.platform}
    - Precio min: ${details.minPrice}€
    - Urgencia: ${details.urgency}
    - Entrega: ${details.delivery}

    DEBES SEGUIR ESTA ESTRUCTURA EXACTA. 
    REGLA CRÍTICA: Las secciones con (TEXTO PLANO) deben ser puramente texto, sin markdown, listas con guiones simples o emojis, listas para copiar y pegar en apps.

    ### 📸 ANÁLISIS DE IMAGEN
    (Markdown) - Reporte del estado del producto y calidad fotográfica.

    ### 💰 PRECIO Y ESTRATEGIA
    (Markdown) - Precio recomendado, justificación y cuándo relistar si no se vende.

    ### 📝 TÍTULO OPTIMIZADO (TEXTO PLANO)
    Un solo título potente.

    ### ✍️ DESCRIPCIÓN MAESTRA (TEXTO PLANO)
    Descripción completa con gancho, detalles técnicos y cierre. Incluye al final un bloque de hashtags relevantes.

    ### 💬 MENSAJE PARA FAVORITOS (TEXTO PLANO)
    Un mensaje amable para enviar a quienes den "like" al producto. Ej: "Hola! He visto que te interesa el [producto], si te lo quedas hoy puedo [oferta/envío rápido]...".

    ### ⚡ RESPUESTAS RÁPIDAS (TEXTO PLANO)
    3 plantillas cortas para: 1. Confirmar disponibilidad. 2. Responder a oferta ridícula (educado). 3. Resolver dudas sobre el envío.

    ### 🎯 PROTIPS DE NEGOCIACIÓN
    (Markdown) - Cómo actuar si te piden rebaja, qué detalles omitir y qué resaltar.
  `;

  const proResponse = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: [
      {
        parts: [
          { inlineData: { data: base64Image, mimeType: 'image/jpeg' } },
          { text: analysisPrompt }
        ]
      },
    ],
    config: {
      thinkingConfig: { thinkingBudget: 32768 }
    }
  });

  return {
    fullAnalysis: proResponse.text || "No se pudo generar el análisis.",
    marketUrls
  };
};

// Helper function to enhance product images using gemini-2.5-flash-image
export const enhanceProductImage = async (
  base64Image: string,
  prompt: string = "Mejora el fondo para que parezca un estudio profesional, ajusta la iluminación y el contraste para resaltar el producto sin modificarlo."
): Promise<string | null> => {
  // Always create a new GoogleGenAI instance right before making an API call
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { data: base64Image, mimeType: 'image/jpeg' } },
        { text: prompt }
      ]
    }
  });

  // Find the image part in the response candidates, as nano banana models can return both text and image parts
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      const base64EncodeString: string = part.inlineData.data;
      return `data:image/png;base64,${base64EncodeString}`;
    }
  }
  return null;
};
