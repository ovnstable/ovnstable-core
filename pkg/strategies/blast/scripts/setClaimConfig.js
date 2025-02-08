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
    const provider = new ethers.providers.JsonRpcProvider(
        "http://localhost:8545"
    );
    await provider.send("hardhat_impersonateAccount", ["0x086dFe298907DFf27BD593BD85208D57e0155c94"]);
    const dev5 = provider.getSigner("0x086dFe298907DFf27BD593BD85208D57e0155c94");

    let fenixSwap = await getContract('StrategyFenixSwap', 'blast');
    let thrusterSwap = await getContract('StrategyThrusterSwap', 'blast');
    await fenixSwap.connect(dev5).setClaimConfig(await getConfig());
    await thrusterSwap.connect(dev5).setClaimConfig(await getConfig());

    console.log(await fenixSwap.claimConfig());
    console.log(await thrusterSwap.claimConfig());
}

async function getConfig() {
    return {
        operation: OPERATIONS.SEND,
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