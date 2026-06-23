import os
import sys
from pathlib import Path
from google import genai
from google.cloud import texttospeech

project_id = os.getenv("GCLOUD_PROJECT_ID", "project-7f48a3c4-a89e-4b43-9bc")

def test_vertex_ai() -> None:
    client = genai.Client(
        vertexai=True,
        project=project_id,
        location="us-central1"
    )
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents="Say hello in French"
    )
    print("Vertex AI Response:", response.text)

def generate_speech() -> None:
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
    
    words = text.split()
    print(f"Text word count: {len(words)}")

    client = texttospeech.TextToSpeechClient()
    synthesis_input = texttospeech.SynthesisInput(text=text)

    voice = texttospeech.VoiceSelectionParams(
        language_code="en-US",
        name="en-US-Wavenet-F"
    )

    audio_config = texttospeech.AudioConfig(
        audio_encoding=texttospeech.AudioEncoding.MP3
    )

    response = client.synthesize_speech(
        input=synthesis_input,
        voice=voice,
        audio_config=audio_config
    )

    output_dir = Path("media/audio")
    output_dir.mkdir(parents=True, exist_ok=True)
    output_file = output_dir / "output.mp3"

    with open(output_file, "wb") as out:
        out.write(response.audio_content)
        
    print(f"Speech saved successfully to: {output_file.resolve()}")

if __name__ == "__main__":
    try:
        print("Testing Vertex AI...")
        test_vertex_ai()
        print("\nTesting Text-to-Speech...")
        generate_speech()
    except Exception as e:
        print(f"Error during execution: {str(sys.exc_info()[1])}")
        sys.exit(1)
