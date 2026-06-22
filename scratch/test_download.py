import os
import sys
from io import BytesIO
from dotenv import load_dotenv
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

# Load env from backend/.env
dotenv_path = os.path.join(os.path.dirname(__file__), '../backend/.env')
load_dotenv(dotenv_path)

def get_drive_service():
    client_id = os.environ.get("GOOGLE_CLIENT_ID")
    client_secret = os.environ.get("GOOGLE_CLIENT_SECRET")
    refresh_token = os.environ.get("GOOGLE_REFRESH_TOKEN")
    
    creds = Credentials(
        None,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=client_id,
        client_secret=client_secret
    )
    return build('drive', 'v3', credentials=creds)

def test_fetch(drive_file_id):
    try:
        service = get_drive_service()
        print(f"Fetching metadata for file ID: {drive_file_id}")
        file_meta = service.files().get(fileId=drive_file_id, fields='mimeType, name', supportsAllDrives=True).execute()
        print(f"Metadata: {file_meta}")
        
        print("Fetching file content...")
        request = service.files().get_media(fileId=drive_file_id)
        # Try execute
        content = request.execute()
        print(f"Successfully downloaded {len(content)} bytes.")
    except Exception as e:
        print(f"Error fetching file: {str(e)}")

if __name__ == "__main__":
    test_fetch("1hD9fF6IqXB3IgdAuSVPhnk-FtUYaTusx")
