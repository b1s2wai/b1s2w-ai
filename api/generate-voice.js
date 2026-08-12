export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {

    const {
      text,
      voice
    } = req.body || {};

    if (!text) {
      return res.status(400).json({
        error: "Text is required."
      });
    }

    /*
     * আপাতত voice mapping তৈরি করছি।
     *
     * Character 1 → voice1
     * Character 2 → voice2
     * Character 3 → voice3
     */

    const voiceMap = {

      voice1: {
        name: "Male 1",
        description: "Natural male voice"
      },

      voice2: {
        name: "Female 1",
        description: "Natural female voice"
      },

      voice3: {
        name: "Male 2",
        description: "Deep male voice"
      },

      voice4: {
        name: "Female 2",
        description: "Soft female voice"
      },

      voice5: {
        name: "Male 3",
        description: "Young male voice"
      },

      voice6: {
        name: "Female 3",
        description: "Young female voice"
      },

      voice7: {
        name: "Male 4",
        description: "Anime male voice"
      },

      voice8: {
        name: "Female 4",
        description: "Anime female voice"
      },

      voice9: {
        name: "Neutral",
        description: "Neutral voice"
      }

    };

    const selectedVoice =
      voiceMap[voice] ||
      voiceMap.voice1;

    /*
     * এখানে পরের ধাপে আসল TTS API
     * connect করা হবে।
     */

    return res.status(200).json({

      success: true,

      text,

      voice: voice || "voice1",

      voiceName:
        selectedVoice.name,

      description:
        selectedVoice.description,

      message:
        "Voice configuration ready."

    });

  } catch (error) {

    return res.status(500).json({
      error:
        error.message ||
        "Voice generation failed."
    });

  }

      }
