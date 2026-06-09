"""
oracle_api/blockchain.py
-------------------------
Fortified, fully asynchronous Web3 Engine Interface linking the Oracle API to Sepolia.
Features thread-safe async nonce management, dynamic priority gas scaling, 
and paginated ledger reads to support pure decentralized execution.
"""

import os
import logging
import asyncio
from typing import List
from fastapi import HTTPException, status
from web3 import AsyncWeb3
from web3.providers.async_rpc import AsyncHTTPProvider

log = logging.getLogger("oracle_api.blockchain")

# ── Environment Configurations ───────────────────────────────────────────────
RPC_URL = os.getenv("SEPOLIA_RPC_URL", "").strip()
CONTRACT_ADDRESS = os.getenv("REGISTRY_CONTRACT_ADDRESS", "").strip()
PRIVATE_KEY = os.getenv("ORACLE_PRIVATE_KEY", "").strip()

# Initialize Async Web3 Instance natively to prevent module-level blocking bottlenecks
if not RPC_URL:
    log.warning("SEPOLIA_RPC_URL variable is empty. Blockchain integration will fail to initialize.")
w3 = AsyncWeb3(AsyncHTTPProvider(RPC_URL))

# Dynamic Local ABI Loading with Fallback Security Arrays
abi_path = os.path.join(os.path.dirname(__file__), "contract_abi.json")
try:
    import json
    with open(abi_path, "r") as f:
        data = json.load(f)
    contract_abi = data.get("abi", data) if isinstance(data, dict) else data
except Exception as err:
    log.warning("Local contract_abi.json reading un-resolved: %s. Using minimum spec fallback.", err)
    # Essential structural view signatures to guarantee 1:1 API compatibility
    contract_abi = [
        {
            "inputs": [
                {"internalType": "address", "name": "_wallet", "type": "address"},
                {"internalType": "bytes32", "name": "_ninHash", "type": "bytes32"},
                {"internalType": "string", "name": "_ipfsCid", "type": "string"}
            ],
            "name": "registerIdentity",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [{"internalType": "bytes32", "name": "_ninHash", "type": "bytes32"}],
            "name": "getIpfsCid",
            "outputs": [{"internalType": "string", "name": "", "type": "string"}],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "getTotalRegisteredCount",
            "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {"internalType": "uint256", "name": "_offset", "type": "uint256"},
                {"internalType": "uint256", "name": "_limit", "type": "uint256"}
            ],
            "name": "getIdentityHashesPaginated",
            "outputs": [{"internalType": "bytes32[]", "name": "", "type": "bytes32[]"}],
            "stateMutability": "view",
            "type": "function"
        }
    ]

# Lazy-loaded contract factory allocation framework
def _get_contract():
    if not CONTRACT_ADDRESS:
        raise HTTPException(status_code=500, detail="REGISTRY_CONTRACT_ADDRESS is unconfigured in runtime environment.")
    return w3.eth.contract(address=w3.to_checksum_address(CONTRACT_ADDRESS), abi=contract_abi)


# ── Stateful Thread-Safe Async Nonce Manager ────────────────────────────────
class AsyncNonceTracker:
    """
    Prevents Web3 nonce collisions across concurrent background jobs
    by maintaining an isolated, thread-safe memory lock over the transaction count.
    """
    def __init__(self):
        self._lock = asyncio.Lock()
        self._current_nonce: int | None = None
        self._oracle_addr: str | None = None

    async def get_next_nonce(self, oracle_address: str) -> int:
        async with self._lock:
            # Re-fetch from node only if local state is blank or oracle address identity shifts
            network_nonce = await w3.eth.get_transaction_count(oracle_address, "pending")
            if self._current_nonce is None or network_nonce > self._current_nonce or self._oracle_addr != oracle_address:
                self._oracle_addr = oracle_address
                self._current_nonce = network_nonce
            else:
                self._current_nonce += 1
            return self._current_nonce

nonce_tracker = AsyncNonceTracker()


# ── Core Asymmetric Operations ───────────────────────────────────────────────

async def register_identity_on_chain(user_wallet_address: str, nin_hash: str, ipfs_cid: str) -> str:
    """
    Builds, signs, and broadens an identity registration transaction onto Sepolia natively.
    Guarantees zero nonce collisions and dynamically scales gas parameters under high loads.
    """
    if not PRIVATE_KEY:
        raise HTTPException(status_code=500, detail="ORACLE_PRIVATE_KEY is unconfigured in environment.")

    try:
        oracle_account = w3.eth.account.from_key(PRIVATE_KEY)
        contract = _get_contract()
        
        # 1. Format user parameters safely to strict EVM bytes32 boundaries
        clean_hash = nin_hash if nin_hash.startswith("0x") else "0x" + nin_hash
        bytes32_nin = w3.to_bytes(hexstr=clean_hash).ljust(32, b'\0')[:32]
        checksum_user_wallet = w3.to_checksum_address(user_wallet_address)

        # 2. Acquire an isolated, thread-safe nonce to block validation thread races
        tx_nonce = await nonce_tracker.get_next_nonce(oracle_account.address)

        # 3. Dynamic EIP-1559 Fee Forecasting Integration (Avoids hardcoded starvation gaps)
        fee_history = await w3.eth.fee_history(1, "latest", [25.0])
        base_fee_per_gas = fee_history["baseFeePerGas"][-1]
        
        # Pull priority tip parameter and apply 1.25x scaling for volatility protection
        priority_tip = int(fee_history["reward"][0][0] * 1.25) if "reward" in fee_history and fee_history["reward"] else w3.to_wei('1.5', 'gwei')
        max_fee_total = int(base_fee_per_gas * 1.5) + priority_tip

        # 4. Assemble EIP-1559 Transaction Structure Object
        txn = await contract.functions.registerIdentity(
            checksum_user_wallet, 
            bytes32_nin, 
            ipfs_cid  
        ).build_transaction({
            'chainId': 11155111,  # Strict Sepolia Network Identification Anchor
            'gas': 200000,        # Optimized execution limit allocation
            'maxFeePerGas': max_fee_total,
            'maxPriorityFeePerGas': priority_tip,
            'nonce': tx_nonce,
        })

        # 5. Sign and Broadcast across the Peer-to-Peer network stream
        signed_txn = w3.eth.account.sign_transaction(txn, private_key=PRIVATE_KEY)
        tx_hash = await w3.eth.send_raw_transaction(signed_txn.rawTransaction)
        
        return w3.to_hex(tx_hash)

    except Exception as e:
        log.error("Asynchronous transactional anchoring loop collapsed: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Decentralized ledger anchoring pipeline execution failure: {str(e)}"
        )


async def get_ipfs_cid_from_blockchain(nin_hash: str) -> str:
    """
    Resolves an active citizen IPFS CID from Sepolia mappings natively via async local views.
    """
    try:
        contract = _get_contract()
        clean_hash = nin_hash if nin_hash.startswith("0x") else "0x" + nin_hash
        bytes32_nin = w3.to_bytes(hexstr=clean_hash).ljust(32, b'\0')[:32]
        
        # Target your explicit, clean public view accessor method to decouple parsing from raw variables
        cid = await contract.functions.getIpfsCid(bytes32_nin).call()
        return cid
    except Exception as e:
        log.error("On-chain view query failed for target hash %s: %s", nin_hash, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"On-chain file pointer tracking mapping failed: {str(e)}"
        )


async def get_all_registered_identity_hashes() -> List[str]:
    """
    Streams anchored identity hashes using paginated block segmentation.
    Prevents EVM gas overflow exceptions and handles scaling gracefully.
    """
    try:
        contract = _get_contract()
        total_records = await contract.functions.getTotalRegisteredCount().call()
        
        all_hashes = []
        limit = 500  # Query chunk sizes bounded to maintain short network transmission delays
        offset = 0

        while offset < total_records:
            chunk = await contract.functions.getIdentityHashesPaginated(offset, limit).call()
            for h in chunk:
                all_hashes.append(w3.to_hex(h))
            offset += limit

        return all_hashes
    except Exception as exc:
        log.error("Paginated blockchain data gathering state loop collapsed: %s", exc)
        return []