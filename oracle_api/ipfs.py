import os
import json
import httpx
from typing import Dict, Any

IPFS_RPC_URL = os.getenv("IPFS_RPC_URL", "http://localhost:5001/api/v0")

async def upload_to_ipfs(encrypted_embedding_b64: str, nin: str) -> str:
    # Create the structured JSON payload
    payload = {
        "nin_hash": nin, # Storing hashed identifier for additional anonymity
        "encrypted_embedding": encrypted_embedding_b64
    }
    
    async with httpx.AsyncClient() as client:
        files = {"file": ("template.json", json.dumps(payload))}
        response = await client.post(f"{IPFS_RPC_URL}/add", files=files)
        
        if response.status_code != 200:
            raise Exception(f"IPFS upload failed: {response.text}")
            
        result = response.json()
        return result["Hash"]  # This is the IPFS CID

async def fetch_from_ipfs(cid: str) -> str:
    async with httpx.AsyncClient() as client:
        # IPFS cat endpoint reads file data by CID
        response = await client.post(f"{IPFS_RPC_URL}/cat", params={"arg": cid})
        
        if response.status_code != 200:
            raise Exception(f"Failed fetching from IPFS CID {cid}: {response.text}")
            
        data = response.json()
        return data["encrypted_embedding"]