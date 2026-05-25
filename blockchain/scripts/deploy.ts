import { ethers } from "ethers";
import fs from "fs";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
    console.log("Starting pure Ethers deployment...");

    // 1. Connect directly to Alchemy and your MetaMask wallet
    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY as string, provider);

    // 2. Read the compiled contract JSON (bypassing Hardhat plugins entirely)
    const artifactPath = "./artifacts/contracts/NINRegistry.sol/NINRegistry.json";
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

    // 3. Create the deployment factory using the raw ABI and Bytecode
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);

    console.log("Pushing transaction to the Sepolia blockchain. Waiting for block confirmation...");
    const registry = await factory.deploy();

    // 4. Wait for the network to mine the transaction
    await registry.waitForDeployment();
    const address = await registry.getAddress();

    console.log(`✅ NINRegistry successfully deployed to: ${address}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});