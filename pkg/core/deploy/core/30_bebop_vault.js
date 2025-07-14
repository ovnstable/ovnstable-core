const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const { COMMON } = require("@overnight-contracts/common/utils/assets");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deployProxy('BebopVault', deployments, save);

    let vault = await ethers.getContract('BebopVault');
    await (await vault.setBebopSettlement(await getParams())).wait();

    console.log('BebopVault deploy done()');
};

async function getParams() {
    return COMMON.bebopSettlement;
}

module.exports.tags = ['BebopVault'];
module.exports.getParams = getParams;
