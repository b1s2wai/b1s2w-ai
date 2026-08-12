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

The video may contain ONE, TWO, THREE, FOUR, or MANY speakers.

IMPORTANT:
Detect every clearly distinguishable spoken dialogue segment.

For every dialogue segment:

1. Identify the speaker.
2. Use stable speaker labels:
   Character 1
   Character 2
   Character 3
   Character 4
   etc.

3. Give the speaker a stable speakerId:
   speaker_1
   speaker_2
   speaker_3
   etc.

IMPORTANT SPEAKER RULE:
Once a speaker has been identified as Character 1, keep that same speakerId throughout the entire video whenever that same person speaks again.

Do NOT create a new Character number for the same person.

4. Estimate dialogue start time.
5. Estimate dialogue end time.
6. Transcribe the original spoken words.
7. Translate the dialogue into the requested target language.

VOICE RULE:

Do NOT randomly assign voices.

Return the voice field according to the speaker number:

Character 1 = voice1
Character 2 = voice2
Character 3 = voice3
Character 4 = voice4
Character 5 = voice5
Character 6 = voice6
Character 7 = voice7
Character 8 = voice8
Character 9 = voice9

The same speaker MUST always keep the same voice.

For example:

Character 1 speaks
→ voice1

Character 2 speaks
→ voice2

Character 1 speaks again
→ voice1

Character 3 speaks
→ voice3

Do NOT give Character 1 a different voice later.

Do not merge different speakers into one dialogue.

Do not invent dialogue.

If speech is unclear, preserve the closest understandable transcription.

Keep every dialogue segment in chronological order.

Return ONLY valid JSON.

Use exactly this structure:

{
  "detectedLanguage": "language name",
  "dialogues": [
    {
      "speaker": "Character 1",
      "speakerId": "speaker_1",
      "voice": "voice1",
      "startTime": "00:00.00",
      "endTime": "00:01.50",
      "transcript": "Original spoken dialogue",
      "translation": "Translated dialogue"
    }
  ]
}

Rules:

- Keep chronological order.
- Every dialogue must have startTime.
- Every dialogue must have endTime.
- Use MM:SS.xx format.
- Keep speakerId stable.
- Keep voice stable.
- Never create a new speakerId for the same speaker.
- Do not merge different speakers.
- Do not invent speech.

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

    /*
     * ==========================================
     * STABLE CHARACTER → VOICE SYSTEM
     * ==========================================
     */

    const voicePool = [
      "voice1",
      "voice2",
      "voice3",
      "voice4",
      "voice5",
      "voice6",
      "voice7",
      "voice8",
      "voice9"
    ];

    const speakerVoiceMap = {};

    let nextVoiceIndex = 0;

    const cleanedDialogues = dialogues.map(
      (item, index) => {

        const speakerNumber =
          getSpeakerNumber(
            item,
            index
          );

        const speakerId =
          `speaker_${speakerNumber}`;

        const speaker =
          `Character ${speakerNumber}`;

        /*
         * একই Character-এর জন্য
         * একই voice রাখা হবে।
         */

        if (!speakerVoiceMap[speakerId]) {

          speakerVoiceMap[speakerId] =
            voicePool[
              (speakerNumber - 1) %
              voicePool.length
            ];

        }

        return {

          speaker,

          speakerId,

          voice:
            speakerVoiceMap[speakerId],

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
        };
      }
    );

    return res.status(200).json({

      detectedLanguage:
        result.detectedLanguage ||
        "",

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


/*
 * ==========================================
 * SPEAKER NUMBER DETECTION
 * ==========================================
 */

function getSpeakerNumber(item, index) {

  /*
   * speakerId থাকলে সেটি ব্যবহার করি।
   */

  const speakerId =
    String(
      item?.speakerId ||
      ""
    );

  const idMatch =
    speakerId.match(
      /(?:speaker[_ -]?)(\d+)/i
    );

  if (idMatch) {

    const number =
      parseInt(
        idMatch[1],
        10
      );

    if (
      Number.isInteger(number) &&
      number > 0
    ) {

      return number;
    }
  }


  /*
   * speaker = Character 1
   * speaker = Character 2
   * ইত্যাদি হলে number বের করি।
   */

  const speakerName =
    String(
      item?.speaker ||
      ""
    );

  const nameMatch =
    speakerName.match(
      /(?:character|speaker)[ _-]?(\d+)/i
    );

  if (nameMatch) {

    const number =
      parseInt(
        nameMatch[1],
        10
      );

    if (
      Number.isInteger(number) &&
      number > 0
    ) {

      return number;
    }
  }


  /*
   * কিছু না পাওয়া গেলে
   * বর্তমান index-এর ভিত্তিতে fallback।
   */

  return index + 1;
          }
