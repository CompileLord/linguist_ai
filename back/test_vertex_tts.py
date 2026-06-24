import asyncio
import os
import sys
from pathlib import Path
from app.services.media.storage_service import StorageService
from app.services.media.tts_service import TextToSpeechService

async def run_test() -> None:
    text = (
        "Learning a new language is a beautiful journey that opens doors to new worlds, "
        "connects cultures, and broadens our understanding of humanity. When we practice "
        "regularly, our brain adapts, building strong neural pathways that help us remember "
        "vocabulary and understand complex grammar structures. Using advanced artificial "
        "intelligence, like Google Vertex AI, helps learners receive personalized content, "
        "realistic conversations, and instant feedback tailored specifically to their needs. "
        "This accelerates the learning process, making it more engaging and effective. Every "
        "word spoken and every sentence written is a step closer to fluency and confidence in "
        "global communication. It is a rewarding experience."
    )
    
    storage_service = StorageService()
    tts_service = TextToSpeechService(storage_service)
    
    audio_content = await tts_service.synthesize(
        text=text,
        language_code="en",
        voice_name="hfc_female"
    )
    
    output_dir = Path("media/audio")
    output_dir.mkdir(parents=True, exist_ok=True)
    output_file = output_dir / "output_piper.wav"
    
    with open(output_file, "wb") as out:
        out.write(audio_content)
        
    print(f"Speech saved successfully to: {output_file.resolve()}")

if __name__ == "__main__":
    try:
        asyncio.run(run_test())
    except Exception as e:
        print(f"Error: {str(e)}")
        sys.exit(1)
