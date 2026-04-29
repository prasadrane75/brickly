import fs from "node:fs";
import path from "node:path";
import { ethers } from "ethers";
import { BlockchainSyncStatus } from "../../../db/prisma-client.js";
import { env } from "../../../config/env.js";
import type {
  BlockchainProvider,
  BlockchainSyncInput,
  BlockchainSyncResult,
  IssueSharesInput,
  TransferSharesInput,
} from "../types.js";

type ContractArtifact = {
  abi: ethers.InterfaceAbi;
  bytecode?: string;
};

let cachedArtifact: ContractArtifact | null = null;
let cachedContractAddress: string | null = env.blockchainContractAddress || null;

function resolveArtifactPath() {
  const relativeArtifactPath =
    "artifacts/contracts/BricklyOwnershipRegistry.sol/BricklyOwnershipRegistry.json";
  const candidates = [
    path.join(process.cwd(), relativeArtifactPath),
    path.join(process.cwd(), "..", "..", relativeArtifactPath),
    path.join(process.cwd(), "..", "..", "..", relativeArtifactPath),
  ];

  const match = candidates.find((candidate) => fs.existsSync(candidate));
  if (!match) {
    throw new Error(
      `Unable to locate compiled contract artifact. Checked: ${candidates.join(", ")}`
    );
  }

  return match;
}

function getArtifact(): ContractArtifact {
  if (cachedArtifact) {
    return cachedArtifact;
  }

  const artifactPath = resolveArtifactPath();
  const file = fs.readFileSync(artifactPath, "utf8");
  cachedArtifact = JSON.parse(file) as ContractArtifact;
  return cachedArtifact;
}

function getProvider() {
  const rpcUrl = env.blockchainRpcUrl || "http://127.0.0.1:8545";
  return new ethers.JsonRpcProvider(rpcUrl, env.blockchainChainId ?? 31337);
}

function getWallet(provider: ethers.JsonRpcProvider) {
  return new ethers.Wallet(env.blockchainDeployerPrivateKey, provider);
}

function propertyKey(propertyId: string) {
  return ethers.id(propertyId);
}

function metadataHash(metadata: Record<string, unknown>) {
  return ethers.id(JSON.stringify(metadata));
}

async function deployContractIfNeeded(): Promise<string> {
  if (cachedContractAddress) {
    return cachedContractAddress;
  }

  const artifact = getArtifact();
  const provider = getProvider();
  const wallet = getWallet(provider);
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode!, wallet);
  const contract = await factory.deploy();
  await contract.waitForDeployment();
  cachedContractAddress = await contract.getAddress();
  return cachedContractAddress;
}

async function getContract() {
  const address = await deployContractIfNeeded();
  const artifact = getArtifact();
  const provider = getProvider();
  const wallet = getWallet(provider);

  return new ethers.Contract(address, artifact.abi, wallet);
}

function toBlockNumber(receipt: ethers.TransactionReceipt | null) {
  if (!receipt) {
    return null;
  }

  return typeof receipt.blockNumber === "number" ? receipt.blockNumber : null;
}

function failureResult(
  note: string,
  walletAddress: string | null,
  payload: Record<string, unknown> | null
): BlockchainSyncResult {
  return {
    status: BlockchainSyncStatus.FAILED,
    txHash: null,
    blockNumber: null,
    contractAddress: cachedContractAddress,
    chainId: env.blockchainChainId,
    walletAddress,
    proofPayload: payload,
    note,
  };
}

export const hardhatLocalProvider: BlockchainProvider = {
  status: env.blockchainEnabled ? "hardhat-local" : "disabled",

  getRuntimeConfig() {
    return {
      enabled: env.blockchainEnabled,
      provider: env.blockchainProvider,
      network: env.blockchainNetwork,
      chainId: env.blockchainChainId,
      contractAddress: cachedContractAddress,
      syncConfirmations: env.blockchainSyncConfirmations,
    };
  },

  async issueShares(input: IssueSharesInput): Promise<BlockchainSyncResult> {
    const runtime = this.getRuntimeConfig();

    if (!runtime.enabled) {
      return {
        status: BlockchainSyncStatus.SKIPPED,
        txHash: null,
        blockNumber: null,
        contractAddress: runtime.contractAddress,
        chainId: runtime.chainId,
        walletAddress: input.holderAddress,
        proofPayload: {
          ...input.metadata,
          holderAddress: input.holderAddress,
          sharesOwned: input.sharesOwned,
          propertyId: input.propertyId,
        },
        note: "Blockchain is optional and currently disabled for this environment.",
      };
    }

    try {
      const contract = await getContract();
      const tx = await contract.recordOwnership(
        propertyKey(input.propertyId),
        input.holderAddress,
        BigInt(input.sharesOwned),
        metadataHash(input.metadata)
      );
      const receipt = await tx.wait(env.blockchainSyncConfirmations);

      return {
        status: BlockchainSyncStatus.CONFIRMED,
        txHash: tx.hash,
        blockNumber: toBlockNumber(receipt),
        contractAddress: await contract.getAddress(),
        chainId: runtime.chainId,
        walletAddress: input.holderAddress,
        proofPayload: {
          ...input.metadata,
          holderAddress: input.holderAddress,
          sharesOwned: input.sharesOwned,
          propertyId: input.propertyId,
        },
        note: "Ownership shares were issued on the configured Hardhat contract.",
      };
    } catch (error: any) {
      console.error("[blockchain] issueShares failed:", error?.message || error);
      return failureResult(
        error?.message || "Failed to issue shares on Hardhat local contract.",
        input.holderAddress,
        {
          ...input.metadata,
          holderAddress: input.holderAddress,
          sharesOwned: input.sharesOwned,
          propertyId: input.propertyId,
        }
      );
    }
  },

  async transferShares(input: TransferSharesInput): Promise<BlockchainSyncResult> {
    const runtime = this.getRuntimeConfig();

    if (!runtime.enabled) {
      return {
        status: BlockchainSyncStatus.SKIPPED,
        txHash: null,
        blockNumber: null,
        contractAddress: runtime.contractAddress,
        chainId: runtime.chainId,
        walletAddress: input.toAddress,
        proofPayload: {
          ...input.metadata,
          fromAddress: input.fromAddress,
          toAddress: input.toAddress,
          sharesTransferred: input.sharesTransferred,
          propertyId: input.propertyId,
        },
        note: "Blockchain is optional and currently disabled for this environment.",
      };
    }

    try {
      const contract = await getContract();
      const tx = await contract.recordTransfer(
        propertyKey(input.propertyId),
        input.fromAddress,
        input.toAddress,
        BigInt(input.sharesTransferred),
        metadataHash(input.metadata)
      );
      const receipt = await tx.wait(env.blockchainSyncConfirmations);

      return {
        status: BlockchainSyncStatus.CONFIRMED,
        txHash: tx.hash,
        blockNumber: toBlockNumber(receipt),
        contractAddress: await contract.getAddress(),
        chainId: runtime.chainId,
        walletAddress: input.toAddress,
        proofPayload: {
          ...input.metadata,
          fromAddress: input.fromAddress,
          toAddress: input.toAddress,
          sharesTransferred: input.sharesTransferred,
          propertyId: input.propertyId,
        },
        note: "Transfer was recorded on the configured Hardhat contract.",
      };
    } catch (error: any) {
      console.error("[blockchain] transferShares failed:", error?.message || error);
      return failureResult(
        error?.message || "Failed to transfer shares on Hardhat local contract.",
        input.toAddress,
        {
          ...input.metadata,
          fromAddress: input.fromAddress,
          toAddress: input.toAddress,
          sharesTransferred: input.sharesTransferred,
          propertyId: input.propertyId,
        }
      );
    }
  },

  async syncRecord(input: BlockchainSyncInput): Promise<BlockchainSyncResult> {
    const payload = input.proofPayload ?? {};

    if (input.recordType === "OWNERSHIP_PROOF") {
      return this.issueShares({
        propertyId: input.entityId,
        holderAddress: String(payload.holderAddress || input.walletAddress || ""),
        sharesOwned: Number(payload.sharesOwned || 0),
        metadata: {
          ...payload,
          entityType: input.entityType,
          entityId: input.entityId,
          recordType: input.recordType,
        },
      });
    }

    return this.transferShares({
      propertyId: String(payload.propertyId || input.entityId),
      fromAddress: String(payload.fromAddress || ""),
      toAddress: String(payload.toAddress || input.walletAddress || ""),
      sharesTransferred: Number(payload.sharesTransferred || 0),
      metadata: {
        ...payload,
        entityType: input.entityType,
        entityId: input.entityId,
        recordType: input.recordType,
      },
    });
  },
};
