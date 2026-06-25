import asyncio
import time
from pathlib import Path
from app.services.media.tts_service import TextToSpeechService
from app.services.media.stt_service import SpeechToTextService
from app.services.media.storage_service import StorageService

async def main() -> None:
    output_dir = Path("media/audio")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    storage = StorageService()
    tts = TextToSpeechService(storage)
    stt = SpeechToTextService()
    
    hundred_words_text = (
        "Language learning is a wonderful experience that broadens our horizons and helps us connect "
        "with diverse cultures around the world. Regular practice is the key to building confidence "
        "and mastering conversational fluency. By practicing speaking every day, we train our minds to "
        "think directly in the target language without translating in our heads. This immersive process "
        "strengthens our communication skills, enhances our active vocabulary, and opens up exciting new career "
        "possibilities globally. Every conversation you hold, every sentence you pronounce correctly, and even the "
        "mistakes you learn from, bring you closer to ultimate fluency and global understanding."
    )
    
    word_count = len(hundred_words_text.split())
    print("=== WHISPER LOCAL BENCHMARK ===")
    print(f"Target Text Word Count: {word_count} words")
    
    print("\nSynthesizing 100-word paragraph to audio...")
    t_tts_start = time.time()
    audio_bytes = await tts.synthesize(text=hundred_words_text, language_code="en", voice_name="hfc_female")
    t_tts_end = time.time()
    
    audio_file = output_dir / "hundred_words_speech.wav"
    with open(audio_file, "wb") as f:
        f.write(audio_bytes)
        
    print(f"Audio file saved to: {audio_file.resolve()}")
    print(f"Piper TTS Synthesis duration: {t_tts_end - t_tts_start:.3f}s")
    
    print("\nRunning local Whisper-base transcription...")
    t_stt_start = time.time()
    result = await stt.transcribe(audio_bytes=audio_bytes, language_code="en-US")
    t_stt_end = time.time()
    
    stt_duration = t_stt_end - t_stt_start
    print(f"Whisper Transcription: '{result.transcript}'")
    print(f"Whisper STT transcription took: {stt_duration:.3f}s")
    print(f"Speed: {stt_duration / word_count * 100:.3f} seconds per 100 words equivalent")

if __name__ == "__main__":
    asyncio.run(main())
