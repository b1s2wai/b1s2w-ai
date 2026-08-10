export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const { prompt, style, duration } = req.body || {};

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({
        error: "Video description is required."
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is missing in Vercel."
      });
    }

    const instruction =
      "You are B1S2W AI Video Prompt Creator. " +
      "Turn the user's simple video idea into a detailed cinematic video-generation prompt. " +
      "Include subject, environment, actions, camera movement, lighting, mood, visual details, " +
      "and continuity instructions. Do not create the actual video. " +
      "Return only the final video prompt.\n\n" +

      "Style: " + (style || "Cinematic") + "\n" +
      "Duration: " + (duration || "5 seconds") + "\n\n" +

      "User idea:\n" + prompt;

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
                  text: instruction
                }
              ]
            }
          ]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error:
          data?.error?.message ||
          "Gemini API request failed."
      });
    }

    const videoPrompt =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!videoPrompt) {
      return res.status(500).json({
        error: "Gemini returned no video prompt."
      });
    }

    return res.status(200).json({
      videoPrompt
    });

  } catch (error) {
    return res.status(500).json({
      error: error.message || "Server error."
    });
  }
              }
