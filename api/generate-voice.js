export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const { text, voice } = req.body || {};

    if (!text) {
      return res.status(400).json({
        error: "Text is required."
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is missing in Vercel."
      });
    }

    const voiceMap = {
      voice1: "Kore",
      voice2: "Aoede",
      voice3: "Fenrir",
      voice4: "Aoede",
      voice5: "Puck",
      voice6: "Aoede",
      voice7: "Puck",
      voice8: "Aoede",
      voice9: "Kore"
    };

    const geminiVoice =
      voiceMap[voice] || "Kore";

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-tts-preview:generateContent",
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
                  text:
                    "TTS the following dialogue. Speak only the dialogue naturally:\n\n" +
                    text
                }
              ]
            }
          ],

          generationConfig: {
            responseModalities: ["AUDIO"],

            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: geminiVoice
                }
              }
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
          "Gemini TTS request failed."
      });
    }

    const audioData =
      data?.candidates?.[0]
        ?.content?.parts?.find(
          part => part?.inlineData?.data
        )
        ?.inlineData?.data;

    if (!audioData) {
      return res.status(500).json({
        error:
          "Gemini returned no audio. " +
          JSON.stringify(data)
      });
    }

    return res.status(200).json({
      success: true,
      voice: voice || "voice1",
      geminiVoice,
      audio:
        `data:audio/pcm;base64,${audioData}`
    });

  } catch (error) {
    return res.status(500).json({
      error:
        error.message ||
        "Voice generation failed."
    });
  }
        }
