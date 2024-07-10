const { expect } = require('chai');
const { deployments, ethers, getNamedAccounts, artifacts } = require('hardhat');
const {
    transferAsset,
    getERC20,
    transferETH,
    initWallet,
    execTimelock,
    getContract,
    getChainId,
} = require('@overnight-contracts/common/utils/script-utils');
const { resetHardhat, greatLess, resetHardhatToLastBlock } = require('@overnight-contracts/common/utils/tests');
const BN = require('bn.js');
const hre = require('hardhat');
const { sharedBeforeEach } = require('@overnight-contracts/common/utils/sharedBeforeEach');
const { toE6, fromE6, fromE18, toAsset, toE18 } = require('@overnight-contracts/common/utils/decimals');
const axios = require('axios');
const { default: BigNumber } = require('bignumber.js');
const { getOdosAmountOut, getOdosSwapData } = require('@overnight-contracts/common/utils/odos-helper');
const { getOdosAmountOutOnly } = require('@overnight-contracts/common/utils/odos-helper.js');

async function main() {
    let zap = await ethers.getContract("AerodromeCLZap");

    let result = await zap.getCurrentPrice("0x4D69971CCd4A636c403a3C1B00c85e99bB9B5606");
    console.log(result);

    // let tokenId = 102914;
    // let poolId = "0x4D69971CCd4A636c403a3C1B00c85e99bB9B5606";
    // let tickRange = [-197200, -194900];
    // let inputTokens = [
    //     {
    //         tokenAddress: "0x4200000000000000000000000000000000000006",
    //         amount: 0,
    //         price: "3072520172653492400000"
    //     },
    //     {
    //         tokenAddress: "0xB79DD08EA68A908A97220C76d19A6aA9cBDE4376",
    //         amount: 0,
    //         price: "1001339157528039300"
    //     }
    // ];
    // let result = await zap.getProportionForRebalance(tokenId, poolId, tickRange, inputTokens);
    // console.log("inputTokenAddresses:", result.inputTokenAddresses);
    // console.log("inputTokenAmounts:", result.inputTokenAmounts.map((x) => x.toString()));
    // console.log("outputTokenAddresses:", result.outputTokenAddresses);
    // console.log("outputTokenProportions:", result.outputTokenProportions.map((x) => x.toString()));
    // console.log("outputTokenAmounts:", result.outputTokenAmounts.map((x) => x.toString()));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
