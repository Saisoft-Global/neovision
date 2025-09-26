from pyngrok import ngrok
import uvicorn
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def start_server():
    # Get ngrok auth token from environment
    ngrok_token = os.getenv('NGROK_TOKEN')
    if not ngrok_token:
        print("Please set NGROK_TOKEN in your .env file")
        print("1. Get your token from https://dashboard.ngrok.com/get-started/your-authtoken")
        print("2. Add it to your .env file: NGROK_TOKEN=your_token_here")
        return

    # Configure ngrok
    ngrok.set_auth_token(ngrok_token)
    
    try:
        # Start ngrok tunnel
        public_url = ngrok.connect(8000)
        print(f"\nBackend URL: {public_url}")
        print("\nUpdate your frontend .env file with:")
        print(f"VITE_API_URL={public_url}")
        
        # Start FastAPI server
        uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
        
    except Exception as e:
        print(f"Error starting server: {e}")
    finally:
        # Cleanup ngrok on exit
        ngrok.kill()

if __name__ == "__main__":
    start_server()