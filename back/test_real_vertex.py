import asyncio
import time
from app.services.ai.vertex_provider import VertexAIProvider
from app.services.media.tts_service import TextToSpeechService
from app.services.media.storage_service import StorageService

async def main():
    print("Testing Real Vertex AI Integration...")
    provider = VertexAIProvider()
    prompt = "Hello AI Speaking coach! I am ready to practice English."

    start_time = time.time()
    first_char_time = None
    accumulated_text = ""

    print("Sending prompt to Gemini...")
    try:
        async for chunk in provider.generate_content_stream(prompt):
            if first_char_time is None:
                first_char_time = time.time()
            accumulated_text += chunk

        total_gen_time = time.time() - start_time
        ttft = first_char_time - start_time if first_char_time else 0.0

        print(f"Response: {accumulated_text}")
        print(f"Time to First Token: {ttft:.3f}s")
        print(f"Total AI Stream Generation Time: {total_gen_time:.3f}s")

        print("Testing local Piper TTS synthesis...")
        storage_service = StorageService()
        tts_service = TextToSpeechService(storage_service)

        tts_start = time.time()
        audio_bytes = await tts_service.synthesize(
            text=accumulated_text,
            language_code="en",
            voice_name="hfc_female"
        )
        tts_duration = time.time() - tts_start

        print(f"TTS Audio Bytes Generated: {len(audio_bytes)} bytes")
        print(f"TTS Generation Duration: {tts_duration:.3f}s")

    except Exception as e:
        print(f"Execution failed: {str(e)}")

if __name__ == "__main__":
    asyncio.run(main())
