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
const abiNFTPool = require("./abi/NFTPool.json");
const { getOdosAmountOut, getOdosSwapData } = require("@overnight-contracts/common/utils/odos-helper");
const { getOdosAmountOutOnly } = require("@overnight-contracts/common/utils/odos-helper.js");

describe(`Test`, function () {
    it("swap and put nearly equal", async function () {
        await deployments.fixture(['LynexZap']);
        let zap = await ethers.getContract('LynexZap');
        // let gauge = await ethers.getContractAt("0xEaf988C649f44c4DDFd7FDe1a8cB290569B66253");
        // let pair = await ethers.getContractAt("0x58AaCbccAeC30938cb2bb11653Cad726e5c4194a");
        // let userAddress = "0xcF9342d3Ee1aBB61A788549e41AF85505997E9c2";

        // let balance = await gauge.balanceOf(zap.address);
        // console.log("gauge: zap: ", await gauge.balanceOf(zap.address));
        // console.log("pair: zap: ", await pair.balanceOf(zap.address));
        // console.log("pair: user: ", await pair.balanceOf(userAddress));
        await zap.hotFix();
        
        // console.log("gauge: zap: ", await gauge.balanceOf(zap.address));
        // console.log("pair: zap: ", await pair.balanceOf(zap.address));
        // console.log("pair: user: ", await pair.balanceOf(userAddress));
    });
});