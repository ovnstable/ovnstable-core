const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {BSC} = require("@overnight-contracts/common/utils/assets");

let pair = '0x7e61c053527A7Af0c700aD9D2C8207E386273222';
let router = '0x20a304a7d126758dfe6B243D0fc515F83bCA8431';

module.exports = async ({deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    await deploy('AttackStrategyThenaBusdUsdc', {
        from: deployer,
        args: [],
        log: true,
    });

    const attackContract = await ethers.getContract("AttackStrategyThenaBusdUsdc");

    await (await attackContract.setParams(
        {
            busd: BSC.busd,
            usdc: BSC.usdc,
            pair: pair,
            router: router,
        }
    )).wait();

    console.log("AttackStrategyThenaBusdUsdc deployed");
};

module.exports.tags = ['AttackStrategyThenaBusdUsdc'];
