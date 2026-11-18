/**
 * Smart Recipe Generator - GeminiService
 * Integrates Google Gemini API using @google/generative-ai
 * Implements F-04, KF-07, NFR-04, NFR-05, NFR-07
 */

const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');

const TIMEOUT_MS = 30000; // 30s timeout (NFR-05, KF-07)

let lastUsageMetadata = null;

// Construct Google Gemini responseSchema using SchemaType
const geminiResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    judul: {
      type: SchemaType.STRING,
      description: 'Nama resep masakan dalam bahasa Indonesia'
    },
    estimasi_waktu: {
      type: SchemaType.INTEGER,
      description: 'Total estimasi waktu persiapan dan memasak dalam menit'
    },
    daftar_bahan: {
      type: SchemaType.ARRAY,
      description: 'Daftar bahan yang digunakan beserta takarannya',
      items: {
        type: SchemaType.OBJECT,
        properties: {
          nama: {
            type: SchemaType.STRING,
            description: 'Nama bahan makanan'
          },
          jumlah: {
            type: SchemaType.STRING,
            description: 'Takaran atau jumlah bahan (misal: "250 gram", "3 siung")'
          }
        },
        required: ['nama', 'jumlah']
      }
    },
    langkah_memasak: {
      type: SchemaType.ARRAY,
      description: 'Instruksi langkah demi langkah memasak dalam bahasa Indonesia',
      items: {
        type: SchemaType.STRING
      }
    }
  },
  required: ['judul', 'estimasi_waktu', 'daftar_bahan', 'langkah_memasak']
};

/**
 * Calls Google Gemini API with static prompt and structured JSON schema
 * @param {string} promptText
 * @param {object} customSchema
 * @returns {Promise<object>} Parsed JSON recipe
 */
async function callGemini(promptText, customSchema = geminiResponseSchema) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'your_gemini_api_key_here') {
    const error = new Error('GEMINI_API_KEY tidak dikonfigurasi atau tidak valid');
    error.status = 503;
    throw error;
  }

  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const genAI = new GoogleGenerativeAI(apiKey.trim());

  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.5,
      responseMimeType: 'application/json',
      responseSchema: customSchema
    }
  });

  // Call with timeout (30s)
  const timeoutPromise = new Promise((_, reject) => {
    const timer = setTimeout(() => {
      const err = new Error('Panggilan Gemini API melebihi batas waktu 30 detik');
      err.code = 'ETIMEDOUT';
      err.status = 503;
      reject(err);
    }, TIMEOUT_MS);

    if (timer.unref) timer.unref();
  });

  const apiPromise = (async () => {
    const result = await model.generateContent(promptText);
    const response = await result.response;
    const text = response.text();
    const parsed = JSON.parse(text);

    // Extract & record usage metadata (TK-01, KF-07)
    const usage = response.usageMetadata || {};
    const tokenInfo = {
      promptTokenCount: usage.promptTokenCount || 0,
      candidatesTokenCount: usage.candidatesTokenCount || 0,
      totalTokenCount: usage.totalTokenCount || ((usage.promptTokenCount || 0) + (usage.candidatesTokenCount || 0))
    };

    lastUsageMetadata = tokenInfo;
    console.log(`[Gemini] Token usage: prompt=${tokenInfo.promptTokenCount}, candidates=${tokenInfo.candidatesTokenCount}, total=${tokenInfo.totalTokenCount}`);

    // Attach non-enumerably so JSON remains pure RecipeResult
    Object.defineProperty(parsed, '_tokenUsage', {
      value: tokenInfo,
      enumerable: false,
      writable: true
    });

    return parsed;
  })();

  return Promise.race([apiPromise, timeoutPromise]);
}

function getLastUsage() {
  return lastUsageMetadata;
}

module.exports = {
  callGemini,
  geminiResponseSchema,
  TIMEOUT_MS,
  getLastUsage
};
