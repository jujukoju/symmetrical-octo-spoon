# oracle_api/blockchain.py

import os
import json
from web3 import Web3
from fastapi import HTTPException

# Load environment variables
RPC_URL = os.getenv("SEPOLIA_RPC_URL", "")
CONTRACT_ADDRESS = os.getenv("REGISTRY_CONTRACT_ADDRESS", "")
PRIVATE_KEY = os.getenv("ORACLE_PRIVATE_KEY", "")

# Initialize Web3 Connection
w3 = Web3(Web3.HTTPProvider(RPC_URL))

# Load the ABI
abi_path = os.path.join(os.path.dirname(__file__), "contract_abi.json")
try:
    with open(abi_path, "r") as f:
        data = json.load(f)
        # Handle whether the file is just an array or a dict containing "abi"
        contract_abi = data.get("abi", data) if isinstance(data, dict) else data
except FileNotFoundError:
    contract_abi = []

# Initialize the Contract object
if w3.is_connected() and CONTRACT_ADDRESS and contract_abi:
    registry_contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=contract_abi)
else:
    registry_contract = None

def register_identity_on_chain(user_wallet_address: str, nin_hash: str, encrypted_cid: str) -> str:
    """
    Calls the registerIdentity function on the NINRegistry smart contract.
    Returns the transaction hash.
    """
    if not registry_contract:
        raise HTTPException(status_code=500, detail="Blockchain connection not configured.")

    try:
        # Get the Oracle's wallet address from the private key
        oracle_account = w3.eth.account.from_key(PRIVATE_KEY)
        
        # Build the transaction
        nonce = w3.eth.get_transaction_count(oracle_account.address)
        
        # Ensure NIN hash is formatted as bytes32 for Solidity
        # If nin_hash is a hex string, ensure it's properly padded
        if not nin_hash.startswith("0x"):
            nin_hash = "0x" + nin_hash
        bytes32_nin = Web3.to_bytes(hexstr=nin_hash).ljust(32, b'\0')

        txn = registry_contract.functions.registerIdentity(
            Web3.to_checksum_address(user_wallet_address), 
            bytes32_nin, 
            encrypted_cid
        ).build_transaction({
            'chainId': 11155111, # Sepolia Chain ID
            'gas': 300000,
            'maxFeePerGas': w3.to_wei('2', 'gwei'),
            'maxPriorityFeePerGas': w3.to_wei('1', 'gwei'),
            'nonce': nonce,
        })

        # Sign and send the transaction
        signed_txn = w3.eth.account.sign_transaction(txn, private_key=PRIVATE_KEY)
        tx_hash = w3.eth.send_raw_transaction(signed_txn.rawTransaction)
        
        # Wait for receipt (optional, but good for verification)
        # w3.eth.wait_for_transaction_receipt(tx_hash)

        return w3.to_hex(tx_hash)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Blockchain transaction failed: {str(e)}")