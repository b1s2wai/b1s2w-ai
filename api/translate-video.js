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

Analyze the entire uploaded video, including its audio and visual content.

The video may contain MULTIPLE CHARACTERS / SPEAKERS.

Your most important task is to separate the dialogue of different speakers.

RULES:

1. Detect the spoken language.
2. Transcribe ALL spoken dialogue in chronological order.
3. Identify different speakers whenever possible.
4. NEVER merge dialogue from different speakers into one paragraph.
5. If two characters are speaking, use Character 1 and Character 2.
6. If three characters are speaking, use Character 1, Character 2 and Character 3.
7. Continue this for additional speakers.
8. Keep the same speaker label whenever that speaker talks again.
9. If the actual character name is clearly known from the video, you may use that name.
10. If the name is not known, use Character 1, Character 2, etc.
11. Preserve the order in which people speak.
12. Do not invent dialogue.
13. Do not remove short dialogue such as "हाँ", "क्या?", "नहीं", etc.
14. If two speakers talk very close together, still try to separate their lines.
15. Translate EVERY dialogue line into the selected target language.
16. Preserve the emotion and natural meaning.
17. Do not summarize the dialogue.
18. Do not merge multiple speakers into one speaker.
19. Return ONLY JSON.

Original language:
${originalLanguage || "Auto Detect"}

Target language:
${targetLanguage}

Return EXACTLY this structure:

{
  "detectedLanguage": "Japanese",
  "speakers": [
    {
      "speaker": "Character 1",
      "lines": [
        {
          "transcript": "Original dialogue",
          "translation": "Translated dialogue"
        }
      ]
    },
    {
      "speaker": "Character 2",
      "lines": [
        {
          "transcript": "Original dialogue",
          "translation": "Translated dialogue"
        }
      ]
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
            responseMimeType: "application/json",

            responseSchema: {
              type: "object",

              properties: {
                detectedLanguage: {
                  type: "string"
                },

                speakers: {
                  type: "array",

                  items: {
                    type: "object",

                    properties: {
                      speaker: {
                        type: "string"
                      },

                      lines: {
                        type: "array",

                        items: {
                          type: "object",

                          properties: {
                            transcript: {
                              type: "string"
                            },

                            translation: {
                              type: "string"
                            }
                          },

                          required: [
                            "transcript",
                            "translation"
                          ]
                        }
                      }
                    },

                    required: [
                      "speaker",
                      "lines"
                    ]
                  }
                }
              },

              required: [
                "detectedLanguage",
                "speakers"
              ]
            }
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
      detectedLanguage:
        result.detectedLanguage || "",

      speakers:
        Array.isArray(result.speakers)
          ? result.speakers
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
