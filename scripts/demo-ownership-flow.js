import { network } from "hardhat";

function propertyIdToBytes32(label) {
  return networkHelpers.ethers.id(label);
}

let networkHelpers;

async function loadOrDeployContract() {
  const configuredAddress = process.env.BLOCKCHAIN_CONTRACT_ADDRESS;

  if (configuredAddress) {
    return networkHelpers.ethers.getContractAt(
      "BricklyOwnershipRegistry",
      configuredAddress
    );
  }

  const factory = await networkHelpers.ethers.getContractFactory(
    "BricklyOwnershipRegistry"
  );
  const contract = await factory.deploy();
  await contract.waitForDeployment();
  return contract;
}

async function main() {
  const connection = await network.connect();
  networkHelpers = connection;
  const { ethers } = connection;
  const [deployer, investorA, investorB] = await ethers.getSigners();
  const contract = await loadOrDeployContract();
  const contractAddress = await contract.getAddress();

  const propertyLabel =
    process.env.DEMO_PROPERTY_ID || "brickly:phase3:miami-south-pointe-lofts";
  const propertyId = propertyIdToBytes32(propertyLabel);
  const issueShares = BigInt(process.env.DEMO_ISSUE_SHARES || "100");
  const transferShares = BigInt(process.env.DEMO_TRANSFER_SHARES || "25");
  const issueMetadataHash = ethers.id(`${propertyLabel}:issue`);
  const transferMetadataHash = ethers.id(`${propertyLabel}:transfer`);

  const mintTx = await contract.recordOwnership(
    propertyId,
    investorA.address,
    issueShares,
    issueMetadataHash
  );
  await mintTx.wait();

  const transferTx = await contract.recordTransfer(
    propertyId,
    investorA.address,
    investorB.address,
    transferShares,
    transferMetadataHash
  );
  await transferTx.wait();

  const investorAPosition = await contract.getPosition(
    propertyId,
    investorA.address
  );
  const investorBPosition = await contract.getPosition(
    propertyId,
    investorB.address
  );

  console.log(
    JSON.stringify(
      {
        network: connection.networkName,
        contractAddress,
        propertyLabel,
        propertyId,
        mintTxHash: mintTx.hash,
        transferTxHash: transferTx.hash,
        balances: {
          investorA: investorAPosition.sharesOwned.toString(),
          investorB: investorBPosition.sharesOwned.toString(),
        },
        actors: {
          deployer: deployer.address,
          investorA: investorA.address,
          investorB: investorB.address,
        },
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
