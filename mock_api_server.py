import http.server
import socketserver
import json
import os

PORT = 3001
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class MockAPIHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/api/users':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            with open(os.path.join(DIRECTORY, 'test_api.json'), 'rb') as file:
                self.wfile.write(file.read())
        else:
            super().do_GET()
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

if __name__ == "__main__":
    handler = MockAPIHandler
    
    with socketserver.TCPServer(("", PORT), handler) as httpd:
        print(f"Mock API server started at http://172.104.129.10:{PORT}")
        print(f"Test endpoint: http://172.104.129.10:{PORT}/api/users")
        httpd.serve_forever()
