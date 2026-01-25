"""SharePoint connector service for fetching Excel data via Microsoft Graph API."""

import os
import io
import time
import threading
from datetime import datetime, timezone
from typing import Optional, Dict, Any, Callable
import httpx
import msal
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class SharePointConnector:
    """Connect to SharePoint and fetch Excel files using Microsoft Graph API."""
    
    def __init__(self):
        self.tenant_id = os.getenv('AZURE_TENANT_ID')
        self.client_id = os.getenv('AZURE_CLIENT_ID')
        self.client_secret = os.getenv('AZURE_CLIENT_SECRET')
        self.site_url = os.getenv('SHAREPOINT_SITE_URL')
        self.file_name = os.getenv('SHAREPOINT_FILE_NAME')
        self.refresh_interval = int(os.getenv('SHAREPOINT_REFRESH_INTERVAL', 300))
        
        # Connection state
        self._access_token: Optional[str] = None
        self._token_expires_at: float = 0
        self._site_id: Optional[str] = None
        self._drive_id: Optional[str] = None
        self._file_id: Optional[str] = None
        
        # Status tracking
        self._is_connected = False
        self._last_sync: Optional[datetime] = None
        self._last_error: Optional[str] = None
        self._connection_details: Dict[str, Any] = {}
        
        # Auto-refresh
        self._auto_refresh_enabled = False
        self._refresh_thread: Optional[threading.Thread] = None
        self._stop_refresh = threading.Event()
        self._on_data_refreshed: Optional[Callable[[bytes], None]] = None
        
        # MSAL app
        self._msal_app: Optional[msal.ConfidentialClientApplication] = None
        
    @property
    def is_configured(self) -> bool:
        """Check if all required credentials are configured."""
        return all([
            self.tenant_id,
            self.client_id,
            self.client_secret,
            self.site_url,
            self.file_name
        ])
    
    @property
    def is_connected(self) -> bool:
        """Check if currently connected to SharePoint."""
        return self._is_connected
    
    @property
    def status(self) -> Dict[str, Any]:
        """Get current connection status."""
        return {
            "is_configured": self.is_configured,
            "is_connected": self._is_connected,
            "last_sync": self._last_sync.isoformat() if self._last_sync else None,
            "last_error": self._last_error,
            "auto_refresh_enabled": self._auto_refresh_enabled,
            "refresh_interval_seconds": self.refresh_interval,
            "site_url": self.site_url,
            "file_name": self.file_name,
            "connection_details": self._connection_details
        }
    
    def _get_msal_app(self) -> msal.ConfidentialClientApplication:
        """Get or create MSAL application."""
        if self._msal_app is None:
            authority = f"https://login.microsoftonline.com/{self.tenant_id}"
            self._msal_app = msal.ConfidentialClientApplication(
                self.client_id,
                authority=authority,
                client_credential=self.client_secret
            )
        return self._msal_app
    
    def _get_access_token(self) -> str:
        """Get a valid access token, refreshing if necessary."""
        # Check if current token is still valid (with 5 min buffer)
        if self._access_token and time.time() < (self._token_expires_at - 300):
            return self._access_token
        
        # Acquire new token
        app = self._get_msal_app()
        scopes = ["https://graph.microsoft.com/.default"]
        
        result = app.acquire_token_for_client(scopes=scopes)
        
        if "access_token" in result:
            self._access_token = result["access_token"]
            # Token typically expires in 1 hour
            self._token_expires_at = time.time() + result.get("expires_in", 3600)
            return self._access_token
        else:
            error = result.get("error_description", result.get("error", "Unknown error"))
            raise Exception(f"Failed to acquire token: {error}")
    
    def _make_graph_request(self, endpoint: str, method: str = "GET") -> httpx.Response:
        """Make an authenticated request to Microsoft Graph API."""
        token = self._get_access_token()
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        url = f"https://graph.microsoft.com/v1.0{endpoint}"
        
        with httpx.Client(timeout=60.0) as client:
            if method == "GET":
                response = client.get(url, headers=headers)
            else:
                response = client.request(method, url, headers=headers)
        
        return response
    
    def _extract_site_info(self) -> tuple[str, str]:
        """Extract hostname and site path from SharePoint URL."""
        # URL format: https://tenant.sharepoint.com/sites/SiteName
        from urllib.parse import urlparse
        
        parsed = urlparse(self.site_url)
        hostname = parsed.netloc  # examly467.sharepoint.com
        
        # Extract site path (e.g., /sites/TrainingDeliveryOps)
        path_parts = parsed.path.strip('/').split('/')
        if len(path_parts) >= 2 and path_parts[0] == 'sites':
            site_path = f"/sites/{path_parts[1]}"
        else:
            site_path = parsed.path
        
        return hostname, site_path
    
    def connect(self) -> Dict[str, Any]:
        """
        Establish connection to SharePoint and locate the file.
        Returns connection details and status.
        """
        if not self.is_configured:
            raise Exception("SharePoint connector is not configured. Check environment variables.")
        
        try:
            self._last_error = None
            
            # Step 1: Get Site ID
            hostname, site_path = self._extract_site_info()
            site_endpoint = f"/sites/{hostname}:{site_path}"
            
            print(f"[SharePoint] Connecting to site: {hostname}{site_path}")
            response = self._make_graph_request(site_endpoint)
            
            if response.status_code != 200:
                raise Exception(f"Failed to get site: {response.status_code} - {response.text}")
            
            site_data = response.json()
            self._site_id = site_data.get("id")
            site_name = site_data.get("displayName", "Unknown")
            
            print(f"[SharePoint] Found site: {site_name} (ID: {self._site_id})")
            
            # Step 2: Get Drive ID (document library)
            drives_endpoint = f"/sites/{self._site_id}/drives"
            response = self._make_graph_request(drives_endpoint)
            
            if response.status_code != 200:
                raise Exception(f"Failed to get drives: {response.status_code} - {response.text}")
            
            drives_data = response.json()
            drives = drives_data.get("value", [])
            
            # Find the default document library (usually "Documents" or "Shared Documents")
            self._drive_id = None
            for drive in drives:
                if drive.get("name") in ["Documents", "Shared Documents", "Документы"]:
                    self._drive_id = drive.get("id")
                    break
            
            # If not found, use the first drive
            if not self._drive_id and drives:
                self._drive_id = drives[0].get("id")
            
            if not self._drive_id:
                raise Exception("No document library found in the site")
            
            print(f"[SharePoint] Using drive ID: {self._drive_id}")
            
            # Step 3: Search for the file
            search_endpoint = f"/sites/{self._site_id}/drives/{self._drive_id}/root/search(q='{self.file_name}')"
            response = self._make_graph_request(search_endpoint)
            
            if response.status_code != 200:
                raise Exception(f"Failed to search for file: {response.status_code} - {response.text}")
            
            search_results = response.json().get("value", [])
            
            # Find exact match
            self._file_id = None
            file_info = None
            for item in search_results:
                if item.get("name") == self.file_name:
                    self._file_id = item.get("id")
                    file_info = item
                    break
            
            if not self._file_id:
                # Try listing root folder
                root_endpoint = f"/sites/{self._site_id}/drives/{self._drive_id}/root/children"
                response = self._make_graph_request(root_endpoint)
                
                if response.status_code == 200:
                    items = response.json().get("value", [])
                    for item in items:
                        if item.get("name") == self.file_name:
                            self._file_id = item.get("id")
                            file_info = item
                            break
            
            if not self._file_id:
                raise Exception(f"File '{self.file_name}' not found in the document library")
            
            print(f"[SharePoint] Found file: {self.file_name} (ID: {self._file_id})")
            
            # Connection successful
            self._is_connected = True
            self._connection_details = {
                "site_name": site_name,
                "site_id": self._site_id,
                "drive_id": self._drive_id,
                "file_id": self._file_id,
                "file_name": file_info.get("name") if file_info else self.file_name,
                "file_size": file_info.get("size") if file_info else None,
                "last_modified": file_info.get("lastModifiedDateTime") if file_info else None,
                "web_url": file_info.get("webUrl") if file_info else None
            }
            
            return {
                "success": True,
                "message": "Successfully connected to SharePoint",
                "details": self._connection_details
            }
            
        except Exception as e:
            self._is_connected = False
            self._last_error = str(e)
            print(f"[SharePoint] Connection error: {e}")
            return {
                "success": False,
                "message": str(e),
                "details": None
            }
    
    def fetch_file(self) -> Optional[bytes]:
        """
        Download the Excel file content from SharePoint.
        Returns the file content as bytes.
        """
        if not self._is_connected:
            result = self.connect()
            if not result.get("success"):
                raise Exception(f"Not connected: {result.get('message')}")
        
        try:
            # Download file content
            download_endpoint = f"/sites/{self._site_id}/drives/{self._drive_id}/items/{self._file_id}/content"
            
            token = self._get_access_token()
            headers = {"Authorization": f"Bearer {token}"}
            
            url = f"https://graph.microsoft.com/v1.0{download_endpoint}"
            
            with httpx.Client(timeout=120.0, follow_redirects=True) as client:
                response = client.get(url, headers=headers)
            
            if response.status_code != 200:
                raise Exception(f"Failed to download file: {response.status_code}")
            
            self._last_sync = datetime.now(timezone.utc)
            self._last_error = None
            
            print(f"[SharePoint] File downloaded successfully ({len(response.content)} bytes)")
            
            return response.content
            
        except Exception as e:
            self._last_error = str(e)
            print(f"[SharePoint] Download error: {e}")
            raise
    
    def disconnect(self):
        """Disconnect from SharePoint and stop auto-refresh."""
        self.stop_auto_refresh()
        self._is_connected = False
        self._site_id = None
        self._drive_id = None
        self._file_id = None
        self._access_token = None
        self._connection_details = {}
        print("[SharePoint] Disconnected")
    
    def start_auto_refresh(self, on_data_refreshed: Callable[[bytes], None]):
        """
        Start automatic data refresh in background.
        
        Args:
            on_data_refreshed: Callback function that receives the new file content
        """
        if self._auto_refresh_enabled:
            return
        
        self._on_data_refreshed = on_data_refreshed
        self._auto_refresh_enabled = True
        self._stop_refresh.clear()
        
        def refresh_loop():
            while not self._stop_refresh.is_set():
                try:
                    # Wait for interval
                    self._stop_refresh.wait(self.refresh_interval)
                    
                    if self._stop_refresh.is_set():
                        break
                    
                    # Fetch new data
                    print(f"[SharePoint] Auto-refresh triggered")
                    content = self.fetch_file()
                    
                    if content and self._on_data_refreshed:
                        self._on_data_refreshed(content)
                        
                except Exception as e:
                    print(f"[SharePoint] Auto-refresh error: {e}")
        
        self._refresh_thread = threading.Thread(target=refresh_loop, daemon=True)
        self._refresh_thread.start()
        print(f"[SharePoint] Auto-refresh started (interval: {self.refresh_interval}s)")
    
    def stop_auto_refresh(self):
        """Stop automatic data refresh."""
        if not self._auto_refresh_enabled:
            return
        
        self._auto_refresh_enabled = False
        self._stop_refresh.set()
        
        if self._refresh_thread:
            self._refresh_thread.join(timeout=5)
            self._refresh_thread = None
        
        print("[SharePoint] Auto-refresh stopped")
    
    def update_config(
        self,
        site_url: Optional[str] = None,
        file_name: Optional[str] = None,
        refresh_interval: Optional[int] = None
    ):
        """Update configuration (requires reconnect)."""
        if site_url:
            self.site_url = site_url
        if file_name:
            self.file_name = file_name
        if refresh_interval:
            self.refresh_interval = refresh_interval
        
        # Reset connection state
        self._is_connected = False
        self._site_id = None
        self._drive_id = None
        self._file_id = None


# Global instance
sharepoint_connector = SharePointConnector()
