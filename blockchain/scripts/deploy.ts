import { ethers } from "ethers";
import fs from "fs";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
    console.log("Starting pure Ethers deployment...");

    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY as string, provider);

    const artifactPath = "./artifacts/contracts/NINRegistry.sol/NINRegistry.json";
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);

    console.log("Pushing transaction to the Sepolia blockchain. Waiting for block confirmation...");
    const registry = await factory.deploy();

    await registry.waitForDeployment();
    const address = await registry.getAddress();

    console.log(`✅ NINRegistry successfully deployed to: ${address}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});