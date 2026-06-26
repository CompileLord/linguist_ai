import asyncio
import os
import sys
import time

# Ensure dependencies can be imported
try:
    from app.core.config import settings
    from app.services.ai.vertex_provider import VertexAIProvider
    from app.services.media.storage_service import StorageService
    from app.services.media.tts_service import TextToSpeechService
    from app.services.media.stt_service import SpeechToTextService
except ImportError as e:
    print(f"Error importing modules: {e}")
    print("Make sure you are running this from the 'back' folder and your environment is active.")
    sys.exit(1)

async def test_vertex_ai():
    print("\n--- [Step 1/3] Testing Vertex AI (Gemini) ---")
    print(f"Using Project: {settings.VERTEX_AI_PROJECT}")
    print(f"Using Location: {settings.VERTEX_AI_LOCATION}")
    print(f"Using Model: {settings.VERTEX_AI_MODEL}")
    
    provider = VertexAIProvider()
    prompt = "Reply with exactly one short sentence: 'Linguist AI integrations are fully working!'"
    
    start = time.time()
    try:
        response = await provider.generate_content(prompt)
        duration = time.time() - start
        print(f"Success! Response from Gemini: \"{response.strip()}\" (took {duration:.2f}s)")
        return response.strip()
    except Exception as e:
        print(f"FAILED: Vertex AI Connection error: {e}")
        print("\nEnsure that:")
        print("1. Your environment variables (GCLOUD_PROJECT_ID) are correct.")
        print("2. 'gcloud auth application-default login' was run successfully.")
        print("3. Your Google account has permissions to access the Vertex AI API in this project.")
        sys.exit(1)

async def test_tts(text_to_speak):
    print("\n--- [Step 2/3] Testing Text-To-Speech (Local Piper) ---")
    storage_service = StorageService()
    tts_service = TextToSpeechService(storage_service)
    
    start = time.time()
    try:
        print("Synthesizing audio (first run will download voice models if not present)...")
        audio_bytes = await tts_service.synthesize(
            text=text_to_speak,
            language_code="en",
            voice_name="hfc_female"
        )
        duration = time.time() - start
        print(f"Success! Generated {len(audio_bytes)} bytes of audio (took {duration:.2f}s)")
        return audio_bytes
    except Exception as e:
        print(f"FAILED: TTS Audio generation failed: {e}")
        sys.exit(1)

async def test_stt(audio_bytes):
    print("\n--- [Step 3/3] Testing Speech-To-Text (Local Whisper) ---")
    stt_service = SpeechToTextService()
    
    start = time.time()
    try:
        print("Transcribing synthesized audio using local Whisper model...")
        result = await stt_service.transcribe(
            audio_bytes=audio_bytes,
            language_code="en"
        )
        duration = time.time() - start
        print(f"Success! Transcribed text: \"{result.transcript}\" (took {duration:.2f}s)")
    except Exception as e:
        print(f"FAILED: STT Transcription failed: {e}")
        sys.exit(1)

async def main():
    print("==================================================")
    print("          LinguistAI Integration Validator        ")
    print("==================================================")
    
    # 1. Test AI
    ai_response = await test_vertex_ai()
    
    # 2. Test TTS
    audio = await test_tts(ai_response)
    
    # 3. Test STT
    await test_stt(audio)
    
    print("\n==================================================")
    print(" STATUS: ALL SYSTEMS ARE FUNCTIONAL AND AUTHENTICATED! ")
    print("==================================================")

if __name__ == "__main__":
    asyncio.run(main())
