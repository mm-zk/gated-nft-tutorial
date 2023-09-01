import { HardhatUserConfig } from "hardhat/config";

import "@matterlabs/hardhat-zksync-solc";
import "@matterlabs/hardhat-zksync-deploy";
import "@matterlabs/hardhat-zksync-verify";

const config: HardhatUserConfig = {
  zksolc: {
    version: "latest",
    settings: {},
  },
  defaultNetwork: "zkSyncLocal",
  networks: {
    hardhat: {
      zksync: false,
    },

    zkSyncLocal: {
      url: "http://localhost:8011",
      ethNetwork: "goerli",
      zksync: true,
      // contract verification endpoint
      verifyURL:
        "https://zksync2-testnet-explorer.zksync.dev/contract_verification",
    },
  },
  solidity: {
    version: "0.8.17",
  },
};

export default config;
