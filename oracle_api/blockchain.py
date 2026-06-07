import os
import json
import asyncio
from web3 import Web3
from fastapi import HTTPException

RPC_URL = os.getenv("SEPOLIA_RPC_URL", "")
CONTRACT_ADDRESS = os.getenv("REGISTRY_CONTRACT_ADDRESS", "")
PRIVATE_KEY = os.getenv("ORACLE_PRIVATE_KEY", "")

w3 = Web3(Web3.HTTPProvider(RPC_URL))

abi_path = os.path.join(os.path.dirname(__file__), "contract_abi.json")
try:
    with open(abi_path, "r") as f:
        data = json.load(f)

        contract_abi = data.get("abi", data) if isinstance(data, dict) else data
except FileNotFoundError:
    contract_abi = []

if w3.is_connected() and CONTRACT_ADDRESS and contract_abi:
    registry_contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=contract_abi)
else:
    registry_contract = None


async def register_identity_on_chain(user_wallet_address: str, nin_hash: str, ipfs_cid: str) -> str:
    if not registry_contract:
        raise HTTPException(status_code=500, detail="Blockchain connection not configured.")
    def _sync_register():
        try:
            oracle_account = w3.eth.account.from_key(PRIVATE_KEY)
            
            nonce = w3.eth.get_transaction_count(oracle_account.address)
            
            clean_hash = nin_hash
            if not clean_hash.startswith("0x"):
                clean_hash = "0x" + clean_hash
            
            bytes32_nin = Web3.to_bytes(hexstr=clean_hash)
            if len(bytes32_nin) < 32:
                bytes32_nin = bytes32_nin.ljust(32, b'\0')
            elif len(bytes32_nin) > 32:
                bytes32_nin = bytes32_nin[:32]

            txn = registry_contract.functions.registerIdentity(
                Web3.to_checksum_address(user_wallet_address), 
                bytes32_nin, 
                ipfs_cid  
            ).build_transaction({
                'chainId': 11155111,  
                'gas': 300000,
                'maxFeePerGas': w3.to_wei('2', 'gwei'),
                'maxPriorityFeePerGas': w3.to_wei('1', 'gwei'),
                'nonce': nonce,
            })

            signed_txn = w3.eth.account.sign_transaction(txn, private_key=PRIVATE_KEY)
            tx_hash = w3.eth.send_raw_transaction(signed_txn.rawTransaction)
            
            return w3.to_hex(tx_hash)

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Blockchain transaction failed: {str(e)}")

    return await asyncio.to_thread(_sync_register)


async def get_ipfs_cid_from_blockchain(nin_hash: str) -> str:
    if not registry_contract:
        raise HTTPException(status_code=500, detail="Blockchain connection not configured.")

    def _sync_call():
        try:
            clean_hash = nin_hash if nin_hash.startswith("0x") else "0x" + nin_hash
            bytes32_nin = Web3.to_bytes(hexstr=clean_hash).ljust(32, b'\0')[:32]
            
            cid = registry_contract.functions.identities(bytes32_nin).call()
            return cid
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"On-chain query failed: {str(e)}")

    return await asyncio.to_thread(_sync_call)