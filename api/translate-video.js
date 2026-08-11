export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const {
      videoBase64,
      mimeType,
      originalLanguage,
      targetLanguage
    } = req.body || {};

    if (!videoBase64) {
      return res.status(400).json({
        error: "Video is required."
      });
    }

    if (!mimeType) {
      return res.status(400).json({
        error: "Video MIME type is required."
      });
    }

    if (!targetLanguage) {
      return res.status(400).json({
        error: "Target language is required."
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is missing in Vercel."
      });
    }

    const instruction = `
You are the B1S2W AI Video Translation System.

Analyze the uploaded video.

Your job:
1. Listen carefully to the spoken dialogue/audio.
2. Detect the original spoken language if it is set to Auto Detect.
3. Transcribe the spoken dialogue.
4. Translate the dialogue into ${targetLanguage}.
5. Preserve the meaning, emotion and natural speaking style.
6. Do NOT translate visual elements unless necessary.
7. Return ONLY valid JSON.

Use this exact JSON structure:

{
  "detectedLanguage": "language name",
  "transcript": "original spoken dialogue",
  "translation": "translated dialogue"
}

Original language setting:
${originalLanguage || "Auto Detect"}

Target language:
${targetLanguage}
`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: videoBase64
                  }
                },
                {
                  text: instruction
                }
              ]
            }
          ],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error:
          data?.error?.message ||
          "Gemini video translation request failed."
      });
    }

    const resultText =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!resultText) {
      return res.status(500).json({
        error: "Gemini returned no translation."
      });
    }

    let result;

    try {
      result = JSON.parse(resultText);
    } catch {
      return res.status(500).json({
        error: "Gemini returned invalid JSON."
      });
    }

    return res.status(200).json({
      detectedLanguage: result.detectedLanguage || "",
      transcript: result.transcript || "",
      translation: result.translation || ""
    });

  } catch (error) {
    return res.status(500).json({
      error: error.message || "Server error."
    });
  }
}
