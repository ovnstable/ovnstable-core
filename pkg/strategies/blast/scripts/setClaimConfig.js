const hre = require("hardhat");
const { getContract, showM2M, execTimelock, getPrice, initWallet, transferETH, getERC20ByAddress } = require("@overnight-contracts/common/utils/script-utils");
const path = require('path');

const {BASE, COMMON, BLAST} = require('@overnight-contracts/common/utils/assets');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

const OPERATIONS = {
    REINVEST : 0,
    SEND : 1,
    CUSTOM: 2
}

async function main() {
    let wallet = await initWallet();
    await transferETH(10, wallet.address);
    
    let fenixSwap = await getContract('StrategyFenixSwap', 'localhost'); 
    let gas = {
        gasLimit: 20000000,
        maxFeePerGas: "38000000",
        maxPriorityFeePerGas: "1300000",
    }

    await (await fenixSwap.setClaimConfig(await getConfig())).wait();

    let claimConfig = await fenixSwap.claimConfig();
    console.log(claimConfig)
}

async function getConfig() {
    return {
        operation: OPERATIONS.REINVEST,
        beneficiary: COMMON.rewardWallet,
        distributor: "0x3Ef3D8bA38EBe18DB133cEc108f4D14CE00Dd9Ae",
        __gap: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    };
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });