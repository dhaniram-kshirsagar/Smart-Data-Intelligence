import requests
import json
import time

# Configuration
API_URL = "http://172.104.129.10:9090/api/datapuur"
MOCK_API_URL = "http://172.104.129.10:3001/api/users"

# First, let's get a token by logging in
def get_auth_token():
    print("Getting authentication token...")
    try:
        # The API uses OAuth2 with form data for authentication
        login_response = requests.post(
            "http://172.104.129.10:9090/api/auth/token",
            data={"username": "admin", "password": "admin123"},  # Using the default admin credentials
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        if login_response.status_code == 200:
            token_data = login_response.json()
            token = token_data.get("access_token")
            print("✅ Authentication successful")
            return token
        else:
            print(f"❌ Authentication failed: {login_response.status_code}")
            print(f"Error: {login_response.text}")
            return None
    except Exception as e:
        print(f"❌ Exception during authentication: {str(e)}")
        return None

def test_api_ingestion():
    print("Testing API Ingestion...")
    
    # Get authentication token
    token = get_auth_token()
    if not token:
        print("Cannot proceed without authentication token")
        return
    
    auth_headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }
    
    # 1. Test API connection
    print("\n1. Testing API connection...")
    test_connection_payload = {
        "config": {
            "name": "Test API",
            "url": MOCK_API_URL,
            "method": "GET",
            "headers": {},
            "body": "",
            "authType": "none"
        }
    }
    
    try:
        response = requests.post(
            f"{API_URL}/test-api",
            json=test_connection_payload,
            headers=auth_headers
        )
        
        if response.status_code == 200:
            print("✅ API connection test successful")
            print(f"Response: {json.dumps(response.json(), indent=2)}")
        else:
            print(f"❌ API connection test failed: {response.status_code}")
            print(f"Error: {response.text}")
            return
    except Exception as e:
        print(f"❌ Exception during API connection test: {str(e)}")
        return
    
    # 2. Detect API schema
    print("\n2. Detecting API schema...")
    schema_payload = {
        "config": {
            "name": "Test API",
            "url": MOCK_API_URL,
            "method": "GET",
            "headers": {},
            "body": "",
            "authType": "none",
            "dataPath": "$.users"
        },
        "chunkSize": 100
    }
    
    try:
        response = requests.post(
            f"{API_URL}/api-schema",
            json=schema_payload,
            headers=auth_headers
        )
        
        if response.status_code == 200:
            print("✅ API schema detection successful")
            print(f"Schema: {json.dumps(response.json(), indent=2)}")
        else:
            print(f"❌ API schema detection failed: {response.status_code}")
            print(f"Error: {response.text}")
            return
    except Exception as e:
        print(f"❌ Exception during API schema detection: {str(e)}")
        return
    
    # 3. Start API ingestion
    print("\n3. Starting API ingestion...")
    ingestion_payload = {
        "config": {
            "name": "Test API",
            "url": MOCK_API_URL,
            "method": "GET",
            "headers": {},
            "body": "",
            "authType": "none",
            "dataPath": "$.users",
            "transformationScript": ""
        },
        "chunkSize": 100,
        "enablePolling": False
    }
    
    try:
        response = requests.post(
            f"{API_URL}/ingest-api",
            json=ingestion_payload,
            headers=auth_headers
        )
        
        if response.status_code == 200:
            job_data = response.json()
            job_id = job_data.get("job_id")
            print(f"✅ API ingestion started successfully. Job ID: {job_id}")
            
            # 4. Monitor job status
            print("\n4. Monitoring job status...")
            max_attempts = 10
            attempts = 0
            
            while attempts < max_attempts:
                attempts += 1
                try:
                    status_response = requests.get(
                        f"{API_URL}/job-status/{job_id}",
                        headers=auth_headers
                    )
                    
                    if status_response.status_code == 200:
                        status_data = status_response.json()
                        print(f"Job Status: {status_data.get('status')}, Progress: {status_data.get('progress')}%")
                        
                        if status_data.get('status') in ['completed', 'failed']:
                            print(f"Final status: {json.dumps(status_data, indent=2)}")
                            break
                    else:
                        print(f"❌ Failed to get job status: {status_response.status_code}")
                        print(f"Error: {status_response.text}")
                except Exception as e:
                    print(f"❌ Exception during job status check: {str(e)}")
                
                time.sleep(2)
        else:
            print(f"❌ API ingestion failed: {response.status_code}")
            print(f"Error: {response.text}")
    except Exception as e:
        print(f"❌ Exception during API ingestion: {str(e)}")

if __name__ == "__main__":
    test_api_ingestion()
