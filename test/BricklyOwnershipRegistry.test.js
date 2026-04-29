import assert from "node:assert/strict";
import { network } from "hardhat";

describe("BricklyOwnershipRegistry", function () {
  async function deployFixture() {
    const connection = await network.connect();
    const { ethers } = connection;
    const [owner, investorA, investorB] = await ethers.getSigners();
    const factory = await ethers.getContractFactory("BricklyOwnershipRegistry");
    const contract = await factory.deploy();
    await contract.waitForDeployment();

    return {
      ethers,
      owner,
      investorA,
      investorB,
      contract,
    };
  }

  it("deploys with the deployer as owner", async function () {
    const { contract, owner } = await deployFixture();
    assert.equal(await contract.owner(), owner.address);
  });

  it("records ownership for a holder", async function () {
    const { ethers, contract, investorA } = await deployFixture();
    const propertyId = ethers.id("brickly:test:atlanta");
    const metadataHash = ethers.id("brickly:test:atlanta:issue");

    const tx = await contract.recordOwnership(
      propertyId,
      investorA.address,
      100n,
      metadataHash
    );
    await tx.wait();

    const position = await contract.getPosition(propertyId, investorA.address);

    assert.equal(position.holder, investorA.address);
    assert.equal(position.sharesOwned, 100n);
    assert.equal(position.metadataHash, metadataHash);
  });

  it("records a transfer between holders", async function () {
    const { ethers, contract, investorA, investorB } = await deployFixture();
    const propertyId = ethers.id("brickly:test:miami");

    await (await contract.recordOwnership(
      propertyId,
      investorA.address,
      100n,
      ethers.id("issue")
    )).wait();

    await (await contract.recordTransfer(
      propertyId,
      investorA.address,
      investorB.address,
      25n,
      ethers.id("transfer")
    )).wait();

    const sellerPosition = await contract.getPosition(propertyId, investorA.address);
    const buyerPosition = await contract.getPosition(propertyId, investorB.address);

    assert.equal(sellerPosition.sharesOwned, 75n);
    assert.equal(buyerPosition.sharesOwned, 25n);
  });

  it("rejects non-owner mutation attempts", async function () {
    const { ethers, contract, investorA, investorB } = await deployFixture();
    const propertyId = ethers.id("brickly:test:austin");

    await assert.rejects(
      contract
        .connect(investorB)
        .recordOwnership(propertyId, investorA.address, 100n, ethers.id("issue")),
      /ONLY_OWNER/
    );
  });

  it("rejects transfers that exceed the sender balance", async function () {
    const { ethers, contract, investorA, investorB } = await deployFixture();
    const propertyId = ethers.id("brickly:test:overflow");

    await (await contract.recordOwnership(
      propertyId,
      investorA.address,
      10n,
      ethers.id("issue")
    )).wait();

    await assert.rejects(
      contract.recordTransfer(
        propertyId,
        investorA.address,
        investorB.address,
        25n,
        ethers.id("transfer")
      ),
      /INSUFFICIENT_SHARES/
    );
  });
});
