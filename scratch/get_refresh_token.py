import os
import sys
from dotenv import load_dotenv
from google_auth_oauthlib.flow import InstalledAppFlow

# Load env from backend/.env
dotenv_path = os.path.join(os.path.dirname(__file__), '../backend/.env')
load_dotenv(dotenv_path)

def main():
    client_id = os.environ.get("GOOGLE_CLIENT_ID")
    client_secret = os.environ.get("GOOGLE_CLIENT_SECRET")
    
    if not client_id or not client_secret:
        print("Error: GOOGLE_CLIENT_ID atau GOOGLE_CLIENT_SECRET belum dikonfigurasi di backend/.env")
        sys.exit(1)
        
    print("Membuka browser untuk otentikasi Google Drive...")
    print(f"Client ID: {client_id}")
    
    # Scopes yang dibutuhkan untuk Google Drive
    SCOPES = ['https://www.googleapis.com/auth/drive']
    
    client_config = {
        "installed": {
            "client_id": client_id,
            "client_secret": client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs"
        }
    }
    
    try:
        # Menjalankan local server di port 8085
        flow = InstalledAppFlow.from_client_config(client_config, scopes=SCOPES)
        creds = flow.run_local_server(port=8085, prompt='consent', access_type='offline', open_browser=False)
        
        if not creds.refresh_token:
            print("\nPERINGATAN: Refresh token tidak didapatkan. Hal ini biasanya terjadi jika aplikasi sudah pernah diotorisasi.")
            print("Silakan buka Google Account -> Security -> Third-party apps with account access, hapus akses aplikasi ini, lalu jalankan script ini kembali.")
            return
            
        print("\n=== OTENTIKASI BERHASIL ===")
        print(f"GOOGLE_REFRESH_TOKEN Baru:\n{creds.refresh_token}\n")
        
        # Update file backend/.env secara otomatis
        with open(dotenv_path, 'r') as file:
            lines = file.readlines()
            
        updated = False
        new_lines = []
        for line in lines:
            if line.startswith("GOOGLE_REFRESH_TOKEN="):
                new_lines.append(f'GOOGLE_REFRESH_TOKEN="{creds.refresh_token}"\n')
                updated = True
            else:
                new_lines.append(line)
                
        if not updated:
            new_lines.append(f'\nGOOGLE_REFRESH_TOKEN="{creds.refresh_token}"\n')
            
        with open(dotenv_path, 'w') as file:
            file.writelines(new_lines)
            
        print("File backend/.env telah diperbarui dengan GOOGLE_REFRESH_TOKEN yang baru!")
        print("Silakan restart server backend (uvicorn) Anda.")
        
    except Exception as e:
        print(f"Terjadi kesalahan saat otentikasi: {str(e)}")

if __name__ == "__main__":
    main()
