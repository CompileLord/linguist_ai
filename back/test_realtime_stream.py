import asyncio
import time
import base64
import io
import wave
from app.services.ai.vertex_provider import VertexAIProvider
from app.services.media.tts_service import TextToSpeechService
from app.services.media.storage_service import StorageService

async def run_realtime_test() -> None:
    print("Initializing services...")
    provider = VertexAIProvider()
    storage_service = StorageService()
    tts_service = TextToSpeechService(storage_service)
    
    prompt = "Tell me in 3 sentences what is LinguistAI and what language learning benefits it brings."
    print(f"Prompt: {prompt}")
    
    start_time = time.time()
    first_char_time = None
    first_audio_time = None
    
    accumulated_text = ""
    sentence_buffer = ""
    sentence_count = 0
    
    print("Starting streaming from Vertex AI...")
    async for chunk in provider.generate_content_stream(prompt):
        if first_char_time is None:
            first_char_time = time.time()
            print(f"Time to First Token: {first_char_time - start_time:.3f}s")
            
        accumulated_text += chunk
        sentence_buffer += chunk
        
        while True:
            boundary_idx = -1
            for i, char in enumerate(sentence_buffer):
                if char in (".", "?", "!"):
                    if i + 1 < len(sentence_buffer) and sentence_buffer[i+1] in (".", "?", "!"):
                        continue
                    boundary_idx = i
                    break
                    
            if boundary_idx == -1:
                break
                
            sentence = sentence_buffer[:boundary_idx + 1].strip()
            sentence_buffer = sentence_buffer[boundary_idx + 1:]
            
            if sentence:
                sentence_count += 1
                t_synth_start = time.time()
                audio_bytes = await tts_service.synthesize(
                    text=sentence,
                    language_code="en",
                    voice_name="hfc_female"
                )
                t_synth_end = time.time()
                
                if first_audio_time is None:
                    first_audio_time = t_synth_end
                    print(f"Time to First Audio Chunk: {first_audio_time - start_time:.3f}s (relative to start)")
                
                print(f"Sentence {sentence_count}: '{sentence}'")
                print(f"  Synthesis latency: {t_synth_end - t_synth_start:.3f}s")
                print(f"  Audio size: {len(audio_bytes)} bytes")
                
    remaining_sentence = sentence_buffer.strip()
    if remaining_sentence:
        sentence_count += 1
        t_synth_start = time.time()
        audio_bytes = await tts_service.synthesize(
            text=remaining_sentence,
            language_code="en",
            voice_name="hfc_female"
        )
        t_synth_end = time.time()
        print(f"Sentence {sentence_count} (final): '{remaining_sentence}'")
        print(f"  Synthesis latency: {t_synth_end - t_synth_start:.3f}s")
        print(f"  Audio size: {len(audio_bytes)} bytes")
        
    total_time = time.time() - start_time
    print("\n=== Detailed Performance Report ===")
    print(f"Prompt: {prompt}")
    print(f"Total Response Text: {accumulated_text}")
    print(f"Time to First Token (TTFT): {first_char_time - start_time:.3f}s" if first_char_time else "TTFT: N/A")
    print(f"Time to First Audio (TTFA): {first_audio_time - start_time:.3f}s" if first_audio_time else "TTFA: N/A")
    print(f"Total Sentences Synthesized: {sentence_count}")
    print(f"Total Streaming and Synthesis Time: {total_time:.3f}s")

if __name__ == "__main__":
    asyncio.run(run_realtime_test())
