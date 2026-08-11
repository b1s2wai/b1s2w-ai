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
You are B1S2W AI Multi-Speaker Video Translation System.

Analyze the uploaded video carefully.

IMPORTANT:
The video may contain ONE, TWO, THREE, FOUR, or MANY speakers.

Do NOT return only one dialogue.

Find every clearly distinguishable spoken dialogue segment.

For every dialogue segment:

1. Identify the speaker.
2. Give the speaker a stable label such as:
   Character 1
   Character 2
   Character 3
   etc.

3. Estimate the dialogue start time.
4. Estimate the dialogue end time.
5. Transcribe the original spoken words.
6. Translate the dialogue into the requested target language.
7. Assign a stable voice ID.

VOICE RULE:
- The same speaker should keep the same voice ID throughout the video.
- Character 1 should normally use voice1.
- Character 2 should normally use voice2.
- Character 3 should normally use voice3.
- Character 4 should normally use voice4.
- Character 5 should normally use voice5.
- Character 6 should normally use voice6.
- If more speakers exist, continue with voice7, voice8, etc.
- Do NOT give every dialogue segment a new voice if it belongs to the same speaker.

Do not merge different speakers into one dialogue.

Do not invent dialogue that cannot be heard.

If speech is unclear, preserve the closest understandable transcription.

Return ONLY valid JSON.

Use exactly this structure:

{
  "detectedLanguage": "language name",
  "dialogues": [
    {
      "speaker": "Character 1",
      "speakerId": "speaker_1",
      "voice": "voice1",
      "startTime": "00:02.00",
      "endTime": "00:05.50",
      "transcript": "Original spoken dialogue",
      "translation": "Translated dialogue"
    }
  ]
}

Rules for dialogues:
- Keep chronological order.
- Every dialogue must have startTime and endTime.
- Use MM:SS.xx format.
- Do not put multiple speakers into one dialogue item.
- Keep speakerId stable throughout the video.
- Keep voice stable for the same speaker.

Original language:
${originalLanguage || "auto"}

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
        error: "Gemini returned no dialogue data."
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

    const dialogues =
      Array.isArray(result.dialogues)
        ? result.dialogues
        : [];

    const cleanedDialogues =
      dialogues.map((item, index) => ({
        speaker:
          item.speaker ||
          `Character ${index + 1}`,

        speakerId:
          item.speakerId ||
          `speaker_${index + 1}`,

        voice:
          item.voice ||
          `voice${index + 1}`,

        startTime:
          item.startTime ||
          "00:00.00",

        endTime:
          item.endTime ||
          "00:00.00",

        transcript:
          item.transcript ||
          "",

        translation:
          item.translation ||
          ""
      }));

    return res.status(200).json({
      detectedLanguage:
        result.detectedLanguage || "",

      dialogues:
        cleanedDialogues
    });

  } catch (error) {
    return res.status(500).json({
      error:
        error.message ||
        "Server error."
    });
  }
}
