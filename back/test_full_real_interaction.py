import asyncio
import time
import io
import wave
from pathlib import Path
from app.services.media.tts_service import TextToSpeechService
from app.services.media.stt_service import SpeechToTextService
from app.services.media.storage_service import StorageService
from app.services.ai.vertex_provider import VertexAIProvider

async def main() -> None:
    output_dir = Path("media/audio")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    provider = VertexAIProvider()
    storage = StorageService()
    tts = TextToSpeechService(storage)
    stt = SpeechToTextService()
    
    user_prompt = "Hello! I am excited to practice my conversational English skills with you. Let us discuss travel plans for my summer vacation."
    print("=== STEP 1: Synthesizing User Input Text to Speech ===")
    print(f"User Input Text: '{user_prompt}'")
    
    t0 = time.time()
    user_audio_bytes = await tts.synthesize(text=user_prompt, language_code="en", voice_name="hfc_female")
    t1 = time.time()
    user_audio_file = output_dir / "user_speech_simulated.wav"
    with open(user_audio_file, "wb") as f:
        f.write(user_audio_bytes)
    
    user_tts_duration = t1 - t0
    print(f"User speech audio saved to: {user_audio_file.resolve()}")
    print(f"User Speech synthesis took: {user_tts_duration:.3f}s\n")
    
    print("=== STEP 2: Running Speech to Text (STT) on Saved File ===")
    with open(user_audio_file, "rb") as f:
        raw_audio = f.read()
        
    t2 = time.time()
    try:
        stt_result = await stt.transcribe(audio_bytes=raw_audio, language_code="en-US")
        stt_text = stt_result.transcript
        stt_confidence = f"{stt_result.confidence:.2%}"
        stt_status = "SUCCESS"
    except Exception as e:
        stt_text = user_prompt
        stt_confidence = "N/A (Fallback used)"
        stt_status = f"FAILED - {str(e)}"
        print(f"Warning: STT API call failed. Reason: {str(e)}")
        print("To enable Speech-to-Text in your GCP project, visit:")
        print("https://console.developers.google.com/apis/api/speech.googleapis.com/overview?project=project-7f48a3c4-a89e-4b43-9bc")
        print("Proceeding with text fallback...")
    t3 = time.time()
    
    stt_duration = t3 - t2
    print(f"Transcribed Text: '{stt_text}'")
    print(f"STT Transcription took: {stt_duration:.3f}s\n")
    
    print("=== STEP 3: Streaming Response from Vertex AI & Generating TTS Chunk-by-Chunk ===")
    dialogue = [
        {"role": "user", "parts": [{"text": "SYSTEM INSTRUCTION: You are a friendly AI speaking coach. Speak in clear, natural, and simple language suitable for CEFR B1 level. Keep your responses short (1-3 sentences) and conversational. Do not use complex formatting."}]},
        {"role": "model", "parts": [{"text": "Understood. I am ready to practice English."}]},
        {"role": "user", "parts": [{"text": stt_text}]}
    ]
    
    t_start = time.time()
    first_char_time = None
    first_audio_time = None
    
    accumulated_text = ""
    sentence_buffer = ""
    sentence_count = 0
    ai_speech_files = []
    
    async for chunk in provider.generate_content_stream(dialogue):
        if first_char_time is None:
            first_char_time = time.time()
            
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
                t_s_start = time.time()
                ai_audio_bytes = await tts.synthesize(text=sentence, language_code="en", voice_name="hfc_female")
                t_s_end = time.time()
                
                if first_audio_time is None:
                    first_audio_time = t_s_end
                    
                filename = f"ai_response_sentence_{sentence_count}.wav"
                filepath = output_dir / filename
                with open(filepath, "wb") as f:
                    f.write(ai_audio_bytes)
                ai_speech_files.append(filepath)
                
                print(f"Sentence {sentence_count}: '{sentence}'")
                print(f"  Synthesis latency: {t_s_end - t_s_start:.3f}s")
                print(f"  Audio saved to: {filepath.resolve()}")
                
    remaining_sentence = sentence_buffer.strip()
    if remaining_sentence:
        sentence_count += 1
        t_s_start = time.time()
        ai_audio_bytes = await tts.synthesize(text=remaining_sentence, language_code="en", voice_name="hfc_female")
        t_s_end = time.time()
        
        filename = f"ai_response_sentence_{sentence_count}.wav"
        filepath = output_dir / filename
        with open(filepath, "wb") as f:
            f.write(ai_audio_bytes)
        ai_speech_files.append(filepath)
        
        print(f"Sentence {sentence_count} (final): '{remaining_sentence}'")
        print(f"  Synthesis latency: {t_s_end - t_s_start:.3f}s")
        print(f"  Audio saved to: {filepath.resolve()}")
        
    t_end = time.time()
    
    input_tokens = 0
    output_tokens = 0
    try:
        dialogue_text = "\n".join([part["text"] for turn in dialogue for part in turn["parts"]])
        input_token_res = await provider.client.aio.models.count_tokens(model=provider.model, contents=dialogue_text)
        input_tokens = input_token_res.total_tokens
        output_token_res = await provider.client.aio.models.count_tokens(model=provider.model, contents=accumulated_text)
        output_tokens = output_token_res.total_tokens
    except Exception:
        input_tokens = len(dialogue_text) // 4
        output_tokens = len(accumulated_text) // 4
        
    print("\n=== DETAILED INTERACTION PERFORMANCE REPORT ===")
    print(f"Simulated User Input Text: '{user_prompt}'")
    print(f"Saved User Audio File: {user_audio_file.resolve()}")
    print(f"User Speech Generation Time: {user_tts_duration:.3f}s")
    print(f"Speech to Text Transcribed: '{stt_text}' (STT Status: {stt_status})")
    print(f"STT Transcription Latency: {stt_duration:.3f}s")
    print(f"Vertex AI Text Response: '{accumulated_text}'")
    print(f"Time to First Character (TTFT): {first_char_time - t_start:.3f}s" if first_char_time else "TTFT: N/A")
    print(f"Time to First Audio (TTFA): {first_audio_time - t_start:.3f}s" if first_audio_time else "TTFA: N/A")
    print(f"Total Response and Synthesis Duration: {t_end - t_start:.3f}s")
    print(f"Input Token Count (approx/exact): {input_tokens}")
    print(f"Output Token Count (approx/exact): {output_tokens}")
    print("Saved AI Response Audio Files:")
    for filepath in ai_speech_files:
        print(f"  - {filepath.resolve()}")

if __name__ == "__main__":
    asyncio.run(main())
