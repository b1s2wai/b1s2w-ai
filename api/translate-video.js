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
You are the B1S2W AI Video Dialogue Analyzer.

Analyze the entire uploaded video, including audio and visual content.

The video can contain multiple characters or speakers.

Your job is to create a dialogue timeline.

IMPORTANT RULES:

1. Detect the spoken language.
2. Transcribe every spoken dialogue.
3. Separate different speakers.
4. Keep dialogue in chronological order.
5. Do NOT merge different speakers.
6. Use Character 1, Character 2, Character 3, etc. when names are unknown.
7. Keep the same character number for the same speaker throughout the video.
8. Estimate the start and end timestamp of every dialogue line.
9. Use MM:SS format.
10. Preserve very short dialogue such as "Yes", "No", "What?", etc.
11. Translate every dialogue line into the target language.
12. Preserve emotion and natural meaning.
13. Do not summarize.
14. Do not invent dialogue.
15. Use the visual appearance of characters when useful for distinguishing speakers.
16. If exact timing is uncertain, provide the best reasonable timestamp estimate.
17. Return ONLY valid JSON.

Original language:
${originalLanguage || "Auto Detect"}

Target language:
${targetLanguage}

Return exactly:

{
  "detectedLanguage": "Japanese",
  "dialogues": [
    {
      "speaker": "Character 1",
      "startTime": "00:00",
      "endTime": "00:03",
      "transcript": "Original dialogue",
      "translation": "Translated dialogue"
    },
    {
      "speaker": "Character 2",
      "startTime": "00:03",
      "endTime": "00:06",
      "transcript": "Original dialogue",
      "translation": "Translated dialogue"
    }
  ]
}
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
          "Gemini video analysis failed."
      });
    }

    const resultText =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!resultText) {
      return res.status(500).json({
        error: "Gemini returned no dialogue."
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
      detectedLanguage:
        result.detectedLanguage || "",

      dialogues:
        Array.isArray(result.dialogues)
          ? result.dialogues
          : []
    });

  } catch (error) {
    return res.status(500).json({
      error:
        error.message ||
        "Server error."
    });
  }
    }
