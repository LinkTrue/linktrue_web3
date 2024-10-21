import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
require('hardhat-gas-reporter');
require('dotenv').config()

const DEPLOYER_WALLET_PRIVATE_KEY = process.env.DEPLOYER_WALLET_PRIVATE_KEY!;

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 100,
      },
    }
  },
  networks: {
    op_sepolia: {
      url: `https://sepolia.optimism.io`,
      accounts: [DEPLOYER_WALLET_PRIVATE_KEY],
      chainId: 11155420,
    },
    avalanche :{
      url: "https://api.avax.network/ext/bc/C/rpc",
      accounts: [DEPLOYER_WALLET_PRIVATE_KEY],
      chainId: 43114
    }
  },
  gasReporter: {
    enabled: false,
    currency: 'USD',
  },
};

export default config;
