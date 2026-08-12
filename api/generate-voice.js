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


    const response =
      await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-tts-preview:generateContent",
        {

          method: "POST",

          headers: {

            "Content-Type":
              "application/json",

            "x-goog-api-key":
              apiKey

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

              responseModalities: [
                "AUDIO"
              ],

              speechConfig: {

                voiceConfig: {

                  prebuiltVoiceConfig: {

                    voiceName:
                      geminiVoice

                  }

                }

              }

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


    const audioData =
      data
        ?.candidates?.[0]
        ?.content?.parts?.find(
          part =>
            part?.inlineData?.data
        )
        ?.inlineData?.data;


    if (!audioData) {

      return res.status(500).json({

        error:
          "Gemini returned no audio."

      });

    }


    /*
     * PCM → WAV
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
        "data:audio/wav;base64," +
        wavBase64

    });


  } catch (error) {

    return res.status(500).json({

      error:
        error.message ||
        "Voice generation failed."

    });

  }

}


/* =========================================
   PCM → WAV
========================================= */

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
    bitsPerSample /
    8;


  const blockAlign =
    channels *
    bitsPerSample /
    8;


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
