const { expect } = require("chai");
const { deployments, ethers, getNamedAccounts } = require("hardhat");
const {
    transferAsset,
    getERC20,
    transferETH,
    initWallet,
    execTimelock,
    getContract,
    getChainId,
    findEvent
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

    if (hre.network.name === 'localhost') {
        // if (((hre.ovn && hre.ovn.stand) || process.env.STAND).startsWith('zksync')) {
        //     hre.ethers.provider = new hre.ethers.providers.JsonRpcProvider('http://localhost:8011')
        // } else {
        hre.ethers.provider = new hre.ethers.providers.JsonRpcProvider('http://localhost:8545')
        // }
    }

    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: ["0x086dFe298907DFf27BD593BD85208D57e0155c94"],
    });

    const account3 = await hre.ethers.getSigner("0x086dFe298907DFf27BD593BD85208D57e0155c94");
    // let account1 = await ethers.getImpersonatedSigner("0x086dFe298907DFf27BD593BD85208D57e0155c94");

    console.log(account.address);
    console.log(account3.address);
    console.log((await account3.getBalance()).toString());

    console.log(account.address);
    console.log((await account.getBalance()).toString());

    let ex = await getContract('FundExchange');
    let fund = await getContract('MotivationalFund');

    let bal1 = await fund.balanceOf("0xE3Bad39b9A2330104D0399b17333d994F38C509D");
    
    console.log("payout");
    await (await ex.connect(account3).payout()).wait();

    let bal2 = await fund.balanceOf("0xE3Bad39b9A2330104D0399b17333d994F38C509D");

    console.log("bal1", bal1.toString());
    console.log("bal2", bal2.toString());
    console.log("total deposit", ex.totalDeposit());
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
