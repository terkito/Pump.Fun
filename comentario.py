from transformers import pipeline
import random
import os

# Load the Hugging Face model for text generation
generator = pipeline("text-generation", model="gpt2")

# List of promotional prompts
prompts = [
    "Launching new tokens and marketing tools.",
    "Stay updated with daily token announcements and promotions.",
    "Boost your strategy with exclusive token and tool alerts.",
    "Discover new opportunities with token releases and marketing tools.",
    "Get ahead with our latest token updates and strategies."
]

# Function to generate a complete message
def generate_message():
    try:
        prompt = random.choice(prompts)  # Select a random prompt
        result = generator(prompt, max_new_tokens=20, num_return_sequences=1, temperature=1.2, top_p=0.9)
        
        message = result[0]["generated_text"].strip().replace("\n", " ")  # Clean the generated text
        words = message.split()  # Split the text into words

        # Limit the message to a maximum of 10 words
        final_message = ' '.join(words[:10])

        # Ensure the sentence doesn't end abruptly (avoid cut-off or meaningless words)
        if not final_message.endswith(('.', '!', '?')):
            final_message += '.'

        return final_message
    except Exception as e:
        print(f"Error generating message: {e}")
        return None

# Generate and save the message
message = generate_message()
if message:
    with open("pump.txt", "w", encoding="utf-8") as file:
        file.write(message + "\n")
    
    print(f"Message generated and saved: {message}")
else:
    print("Could not generate a message.")
