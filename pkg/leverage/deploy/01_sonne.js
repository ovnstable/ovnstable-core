const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {OPTIMISM} = require('@overnight-contracts/common/utils/assets');
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
let ethers = require('hardhat').ethers;


module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deployProxy('LeverageSonneStrategy', deployments, save);

    let strategy = await ethers.getContract('LeverageSonneStrategy');
    await (await strategy.setParams(
        {
            asset: OPTIMISM.usdc,
            leverage: '0xc40F949F8a4e094D1b49a23ea9241D289B7b2819',
            controller: '0x60CF091cD3f50420d50fD7f707414d0DF4751C58',
            cAsset: '0xEC8FEa79026FfEd168cCf5C627c7f486D77b765F',
            cLeverage: '0xAFdf91f120DEC93c65fd63DBD5ec372e5dcA5f82',
            oracleAsset: OPTIMISM.oracleUsdc,
            oracleLeverage: '0x9dfc79Aaeb5bb0f96C6e9402671981CdFc424052'
        }
    )).wait();
};

module.exports.tags = ['LeverageSonneStrategy'];
