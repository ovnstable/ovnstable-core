const {getContract, initWallet, getPrice, showHedgeM2M, execTimelock} = require("@overnight-contracts/common/utils/script-utils");
const {toUSDC} = require("@overnight-contracts/common/utils/decimals");
const {POLYGON} = require("@overnight-contracts/common/utils/assets");
const {createProposal} = require("@overnight-contracts/common/utils/governance");
const hre = require("hardhat");

async function main() {

    let strategy = await getContract('StrategyUsdPlusWbnb');

    console.log('ETS address: ' + strategy.address);


    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: ['0x5CB01385d3097b6a189d1ac8BA3364D900666445'],
    });


    const signerWithAddress = await hre.ethers.getSigner('0x5CB01385d3097b6a189d1ac8BA3364D900666445');

    await strategy.connect(signerWithAddress).upgradeTo('0x088984519b6Ad5dc0358fd7c7E592090E2f963DD');

    await strategy.connect(signerWithAddress).setExchanger(signerWithAddress.address);

    await strategy.claimRewards(strategy.address);

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
