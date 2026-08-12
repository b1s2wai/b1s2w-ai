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

    const apiKey =
      process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error:
          "GEMINI_API_KEY is missing in Vercel."
      });
    }

    /*
     * B1S2W Voice → Gemini Voice
     */

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
      voiceMap[voice] ||
      "Kore";


    /*
     * Generate speech
     */

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/interactions",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          "x-goog-api-key":
            apiKey
        },

        body: JSON.stringify({

          model:
            "gemini-3.1-flash-tts-preview",

          input:
            `Synthesize the following dialogue naturally. Do not add or remove words. Speak only the dialogue.\n\n${text}`,

          response_format: {
            type: "audio"
          },

          generation_config: {

            speech_config: [

              {
                voice:
                  geminiVoice
              }

            ]

          }

        })

      }
    );


    const data =
      await response.json();


    if (!response.ok) {

      return res.status(
        response.status
      ).json({

        error:
          data?.error?.message ||
          "Gemini TTS request failed."

      });

    }


    /*
     * Gemini audio output
     */

    const audioData =
      data?.output_audio?.data;


    if (!audioData) {

      return res.status(500).json({

        error:
          "Gemini returned no audio."

      });

    }


    /*
     * Gemini TTS audio is PCM.
     *
     * Convert PCM → WAV
     */

    const wavBase64 =
      pcmToWavBase64(
        audioData
      );


    return res.status(200).json({

      success: true,

      voice:
        voice || "voice1",

      geminiVoice,

      audio:
        `data:audio/wav;base64,${wavBase64}`

    });


  } catch (error) {

    return res.status(500).json({

      error:
        error.message ||
        "Voice generation failed."

    });

  }

}


/*
 * ==========================================
 * PCM → WAV
 * ==========================================
 */

function pcmToWavBase64(
  base64PCM
) {

  const pcm =
    Buffer.from(
      base64PCM,
      "base64"
    );


  const sampleRate =
    24000;

  const channels =
    1;

  const bitsPerSample =
    16;

  const byteRate =
    sampleRate *
    channels *
    bitsPerSample / 8;

  const blockAlign =
    channels *
    bitsPerSample / 8;


  const header =
    Buffer.alloc(44);


  header.write(
    "RIFF",
    0
  );

  header.writeUInt32LE(
    36 + pcm.length,
    4
  );

  header.write(
    "WAVE",
    8
  );

  header.write(
    "fmt ",
    12
  );

  header.writeUInt32LE(
    16,
    16
  );

  header.writeUInt16LE(
    1,
    20
  );

  header.writeUInt16LE(
    channels,
    22
  );

  header.writeUInt32LE(
    sampleRate,
    24
  );

  header.writeUInt32LE(
    byteRate,
    28
  );

  header.writeUInt16LE(
    blockAlign,
    32
  );

  header.writeUInt16LE(
    bitsPerSample,
    34
  );

  header.write(
    "data",
    36
  );

  header.writeUInt32LE(
    pcm.length,
    40
  );


  const wav =
    Buffer.concat([
      header,
      pcm
    ]);


  return wav.toString(
    "base64"
  );

}
