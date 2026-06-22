import os
from dotenv import load_dotenv
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

# Load env from backend/.env
dotenv_path = os.path.join(os.path.dirname(__file__), '../backend/.env')
load_dotenv(dotenv_path)

def get_drive_account_info():
    client_id = os.environ.get("GOOGLE_CLIENT_ID")
    client_secret = os.environ.get("GOOGLE_CLIENT_SECRET")
    refresh_token = os.environ.get("GOOGLE_REFRESH_TOKEN")
    
    if not all([client_id, client_secret, refresh_token]):
        print("Error: Google Drive OAuth2 configuration missing in backend/.env")
        return
        
    creds = Credentials(
        None,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=client_id,
        client_secret=client_secret
    )
    
    try:
        service = build('drive', 'v3', credentials=creds)
        # Ambil informasi akun (user)
        about = service.about().get(fields="user").execute()
        user_info = about.get("user", {})
        print("\n=== GOOGLE DRIVE ACCOUNT INFO ===")
        print(f"Nama       : {user_info.get('displayName')}")
        print(f"Email      : {user_info.get('emailAddress')}")
        print(f"Permission ID: {user_info.get('permissionId')}")
        print("=================================\n")
    except Exception as e:
        print(f"Terjadi kesalahan saat memanggil Google Drive API: {str(e)}")

if __name__ == "__main__":
    get_drive_account_info()
