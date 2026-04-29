import fs from "node:fs";
import path from "node:path";
import { network } from "hardhat";

async function main() {
  const connection = await network.connect();
  const { ethers } = connection;
  const factory = await ethers.getContractFactory("BricklyOwnershipRegistry");
  const contract = await factory.deploy();

  await contract.waitForDeployment();

  const address = await contract.getAddress();
  const deployer = await ethers.provider.getSigner();
  const deployerAddress = await deployer.getAddress();

  const output = {
    network: connection.networkName,
    chainId: Number(connection.networkConfig.chainId || 0),
    contract: "BricklyOwnershipRegistry",
    address,
    deployedBy: deployerAddress,
    deployedAt: new Date().toISOString(),
  };

  const outDir = path.join(process.cwd(), ".hardhat");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, "deployments.json"),
    JSON.stringify(output, null, 2)
  );

  console.log(JSON.stringify(output, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
