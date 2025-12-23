// require("dotenv").config();
// require("@nomiclabs/hardhat-ethers");

// const {
//   ETH_NODE_URI_OPTIMISM,
//   HARDHAT_BLOCK_NUMBER,
//   PK,
// } = process.env;

// const accounts =
//   PK && PK !== ""
//     ? [{ privateKey: PK, balance: "1000000000000000000000" }]
//     : undefined;

// /** @type import('hardhat/config').HardhatUserConfig */
// module.exports = {
//   solidity: "0.8.28",
//   networks: {
//     hardhat: {
//       forking: {
//         url: ETH_NODE_URI_OPTIMISM || "",
//         blockNumber: HARDHAT_BLOCK_NUMBER ? Number(HARDHAT_BLOCK_NUMBER) : undefined,
//       },
//       ...(accounts ? { accounts } : {}),
//     },
//     localhost: {
//       url: "http://127.0.0.1:8545",
//     },
//   },
// };

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
};