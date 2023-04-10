const {verify } = require("@overnight-contracts/common/utils/verify-utils");
const {getContract, initWallet, getERC20ByAddress, impersonateAccount} = require("@overnight-contracts/common/utils/script-utils");
const {Roles} = require("@overnight-contracts/common/utils/roles");
const hre = require("hardhat");
const {ethers} = require("hardhat");

async function main() {

    let strategy = await getContract('StrategyAequinoxBusdUsdcUsdt', 'bsc');

    await (await strategy.setKamaInitial('0xFA0F59Eed2d679eA733867Fa3f09E152928f9F82')).wait();

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

