const { expect } = require("chai");
const { deployments, ethers, getNamedAccounts } = require("hardhat");
const {
    transferAsset,
    getERC20,
    transferETH,
    initWallet,
    execTimelock,
    getContract,
    getChainId
} = require("@overnight-contracts/common/utils/script-utils");
const { resetHardhat, greatLess, resetHardhatToLastBlock } = require("@overnight-contracts/common/utils/tests");
const BN = require("bn.js");
const hre = require("hardhat");
const { sharedBeforeEach } = require("@overnight-contracts/common/utils/sharedBeforeEach");
const { toE6, fromE6, fromE18, toAsset, toE18 } = require("@overnight-contracts/common/utils/decimals");
const axios = require("axios");
const { default: BigNumber } = require("bignumber.js");
const { getOdosAmountOut, getOdosSwapData } = require("@overnight-contracts/common/utils/odos-helper");
const { getOdosAmountOutOnly } = require("../../common/utils/odos-helper.js");

async function main() {
    const signers = await ethers.getSigners();
    const account = signers[0];

    const accounts = await hre.ethers.getSigners();
    const account2 = accounts[0];

    if (hre.network.name === 'localhost') {
        if (((hre.ovn && hre.ovn.stand) || process.env.STAND).startsWith('zksync')) {
            hre.ethers.provider = new hre.ethers.providers.JsonRpcProvider('http://localhost:8011')
        } else {
            hre.ethers.provider = new hre.ethers.providers.JsonRpcProvider('http://localhost:8545')
        }
    }

    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: ["0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"],
    });

    const account3 = await hre.ethers.getSigner("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
    // let account1 = await ethers.getImpersonatedSigner("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");

    console.log(account.address);
    console.log(account3.address);
    console.log(await account3.getBalance());

    const tx = await account3.sendTransaction({
        to: account.address,
        value: ethers.utils.parseEther("1.0")
    });

    console.log(account.address);
    console.log(await account.getBalance());

    await deployments.fixture(['LynexZap']);
        let zap = await ethers.getContract('LynexZap');
        // let gauge = await ethers.getContractAt("0xEaf988C649f44c4DDFd7FDe1a8cB290569B66253");
        // let pair = await ethers.getContractAt("0x58AaCbccAeC30938cb2bb11653Cad726e5c4194a");
        // let userAddress = "0xcF9342d3Ee1aBB61A788549e41AF85505997E9c2";

        // let balance = await gauge.balanceOf(zap.address);
        // console.log("gauge: zap: ", await gauge.balanceOf(zap.address));
        // console.log("pair: zap: ", await pair.balanceOf(zap.address));
        // console.log("pair: user: ", await pair.balanceOf(userAddress));
        console.log("hot fix");
        await zap.hotFix();
        
        // console.log("gauge: zap: ", await gauge.balanceOf(zap.address));
        // console.log("pair: zap: ", await pair.balanceOf(zap.address));
        // console.log("pair: user: ", await pair.balanceOf(userAddress));

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
