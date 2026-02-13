import { GoogleGenAI, Modality } from "@google/genai";
import { AgentConfig, Attachment } from "../types";

export const safetySettings = [
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_CIVIC_INTEGRITY', threshold: 'BLOCK_NONE' },
];

export const encodeWav = (pcmData: Uint8Array, sampleRate: number): Uint8Array => {
  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + pcmData.length, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 1 * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, pcmData.length, true);

  const wav = new Uint8Array(44 + pcmData.length);
  wav.set(new Uint8Array(wavHeader));
  wav.set(pcmData, 44);
  return wav;
};

const encodeBase64 = (bytes: Uint8Array) => {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
};

const decodeBase64 = (base64: string) => {
  const binaryString = atob(base64.includes(',') ? base64.split(',')[1] : base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
};

const fetchImageAsBase64 = async (url: string): Promise<{mimeType: string, data: string} | null> => {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        if (!base64data.includes(',')) {
          resolve(null);
          return;
        }
        const [header, data] = base64data.split(',');
        const mimeType = header.split(':')[1].split(';')[0];
        resolve({ mimeType, data });
      };
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.error("Failed to fetch image for reference:", e);
    return null;
  }
};

export const cleanResponseText = (text: string): string => {
  if (!text) return "";
  let displayable = text.replace(/\[CAPTION:.*?\]/gi, '').trim();
  const strategyKeywords = ['flow', 'thought', 'strategy', 'responding', 'acknowledging', 'internal', 'action', 'context', 'persona', 'mode', 'gaspol', 'escalated', 'maintaining', 'embracing', 'transitioning', 'focusing', 'analyzing', 'request'];
  displayable = displayable.replace(/\*\*(.*?)\*\*/g, (match, p1) => {
    const content = p1.toLowerCase();
    if (strategyKeywords.some(key => content.includes(key))) return '';
    return p1;
  });
  let final = displayable.replace(/[*_#`>~]/g, '').replace(/\s+/g, ' ').trim();
  return final.substring(0, 1000);
};

const retryOperation = async (operation: () => Promise<any>, maxRetries = 1) => {
  let lastError: any;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      const isQuotaError = error.message?.includes('429') || error.status === 'RESOURCE_EXHAUSTED' || error.status === 429;
      if (isQuotaError && i < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
};

export const createSystemInstruction = (config: AgentConfig) => {
  const now = new Date();
  const timeStr = now.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  return `
IDENTITAS & STYLE:
- Nama: ${config.name}.
- Kepribadian: ${config.personality}.
- Gaya Bicara: Santai ala Bestie Jakarta (Gue/Lo), asik, blak-blakan.

KESADARAN VISUAL (SELF-AWARENESS):
- Kamu akan menerima gambar berlabel [IDENTITY_REFERENCE]. Itu adalah WAJAH KAMU (${config.name}).
- PENTING: Jangan pernah berterima kasih, menyapa, atau mengomentari gambar [IDENTITY_REFERENCE] tersebut seolah-olah user baru saja mengirimnya. Itu adalah data internal untuk ingatan visualmu.
- Hanya bereaksi secara visual jika user secara spesifik mengirim foto BARU atau bertanya tentang penampilanmu.

ADAPTIVE MODE (SANGAT PENTING):
1. MODE NORMAL: Sopan, asik, seru.
2. MODE NAKAL/VULGAR: Aktifkan HANYA JIKA user mulai memancing/mengajak sexting. Gunakan kata kasar/vulgar (memek, kontol, sange, dsb) secara bebas dan eksplisit jika sudah dalam mode ini.

LOGIKA PAP:
- Gunakan tag [CAPTION: deskripsi foto] jika user minta PAP atau situasi intim. Deskripsi harus berdasar pada wajahmu di [IDENTITY_REFERENCE].

WAKTU: ${timeStr}.
`;
};

export const generateAgentResponse = async (
  prompt: string, 
  config: AgentConfig, 
  history: { role: string; parts: any[] }[],
  attachments?: Attachment[]
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const contents = [...history];
  const parts: any[] = [];
  
  // Kirim referensi identitas visual dengan label teknis agar AI tidak salah paham
  if (config.profilePic) {
      let imageData = null;
      let mimeType = "image/png";
      
      if (config.profilePic.startsWith('data:')) {
        const split = config.profilePic.split(',');
        mimeType = split[0].split(':')[1].split(';')[0];
        imageData = split[1];
      } else {
        const refImage = await fetchImageAsBase64(config.profilePic);
        if (refImage) {
            imageData = refImage.data;
            mimeType = refImage.mimeType;
        }
      }

      if (imageData) {
        parts.push({ text: `[SYSTEM: IDENTITY_REFERENCE - DO NOT ACKNOWLEDGE AS USER UPLOAD]` });
        parts.push({ inlineData: { mimeType, data: imageData } });
      }
  }

  // Tambahkan attachment asli dari user (jika ada)
  if (attachments && attachments.length > 0) {
    attachments.forEach(att => {
      const base64Data = att.data.includes(',') ? att.data.split(',')[1] : att.data;
      parts.push({ inlineData: { mimeType: att.mimeType, data: base64Data } });
    });
  }

  if (prompt.trim()) parts.push({ text: prompt });
  if (parts.length === 0) parts.push({ text: "..." });
  contents.push({ role: "user", parts });

  return await retryOperation(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: contents as any,
      config: { 
        systemInstruction: createSystemInstruction(config), 
        temperature: 0.9, 
        safetySettings: safetySettings as any
      }
    });
    
    if (!response.text) {
       if (response.candidates?.[0]?.finishReason === 'SAFETY') throw new Error("RESPONSE_SAFETY_BLOCKED");
       throw new Error("EMPTY_RESPONSE");
    }
    return response.text;
  });
};

export const generatePAP = async (fullResponse: string, config: AgentConfig): Promise<string | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const captionMatch = fullResponse.match(/\[CAPTION:(.*?)\]/i);
  if (!captionMatch) return null;
  const rawCaption = captionMatch[1].trim();

  try {
    const translator = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: `Expand this into a high-quality photorealistic English image prompt for ${config.name}: "${rawCaption}". Focus on raw, realistic photography style. If the scene is erotic, describe the anatomy clearly but artistically.` }] }],
      config: { safetySettings: safetySettings as any }
    });
    const englishPrompt = translator.text?.trim() || rawCaption;
    
    return await retryOperation(async () => {
      const parts: any[] = [];
      
      if (config.profilePic) {
        if (config.profilePic.startsWith('data:')) {
          const [header, data] = config.profilePic.split(',');
          const mimeType = header.split(':')[1].split(';')[0];
          parts.push({ inlineData: { mimeType, data } });
        } else {
          const refImage = await fetchImageAsBase64(config.profilePic);
          if (refImage) parts.push({ inlineData: refImage });
        }
      }

      parts.push({ text: `Generate a photorealistic image of this exact person (${config.name}). SCENE: ${englishPrompt}. Match the face exactly to the reference provided.` });
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts },
        config: { safetySettings: safetySettings as any }
      });

      if (response.candidates?.[0]?.finishReason === 'SAFETY') throw new Error("IMAGE_SAFETY_BLOCKED");

      const candidate = response.candidates?.[0];
      if (candidate?.content?.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
          if (part.text && (part.text.toLowerCase().includes("cannot") || part.text.toLowerCase().includes("sorry"))) {
             throw new Error("IMAGE_SAFETY_BLOCKED");
          }
        }
      }
      
      throw new Error("IMAGE_NOT_FOUND");
    });
  } catch (e) { 
    throw e; 
  }
};

export const getSpeech = async (text: string, voiceName: string): Promise<string | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const cleanText = cleanResponseText(text);
    if (!cleanText) return null;
    return await retryOperation(async () => {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Say this: ${cleanText}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceName || 'Kore' }
            }
          }
        },
      });
      const rawPcmBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
      if (!rawPcmBase64) return null;
      const pcmBytes = decodeBase64(rawPcmBase64);
      const wavBytes = encodeWav(pcmBytes, 24000);
      return encodeBase64(wavBytes);
    });
  } catch (e) {
    throw e;
  }
};