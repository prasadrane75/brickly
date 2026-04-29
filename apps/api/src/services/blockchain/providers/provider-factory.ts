import { demoRegistryProvider } from "./demo-registry.provider.js";
import { hardhatLocalProvider } from "./hardhat-local.provider.js";
import type { BlockchainProvider } from "../types.js";
import { env } from "../../../config/env.js";

export function createBlockchainProvider(): BlockchainProvider {
  if (env.blockchainProvider === "hardhat-local") {
    return hardhatLocalProvider;
  }

  return demoRegistryProvider;
}
