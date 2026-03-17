require("dotenv").config();
require("@matterlabs/hardhat-zksync");
require("@matterlabs/hardhat-zksync-deploy");
require("hardhat-deploy");
require("@matterlabs/hardhat-zksync-node");
require("./tasks/deploy");

const { ZKSYNC_RPC_URL, LOCAL_ZKSYNC_RPC_URL, PRIVATE_KEY, ZKSYNC_ANVIL_VERSION } = process.env;

module.exports = {
  zksyncAnvil: {
    version: "0.6.10",
  },
  zksolc: {
    version: "1.5.12",
    compilerSource: "binary",
    settings: {
      optimizer: {
        enabled: true,
        mode: "3",
      },
    },
  },
  defaultNetwork: "zksyncMainnet",
  networks: {
    zksyncMainnet: {
      url: ZKSYNC_RPC_URL || "",
      ethNetwork: "mainnet",
      zksync: true,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    hardhat: {
      zksync: true,
    },
    local: {
      url: LOCAL_ZKSYNC_RPC_URL || "http://127.0.0.1:8011",
      ethNetwork: "mainnet",
      zksync: true,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    }
  },
  solidity: {
    version: "0.8.20",
  },
};
