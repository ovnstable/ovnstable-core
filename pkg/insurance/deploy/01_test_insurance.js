const {deployProxy, deployProxyMulti} = require("@overnight-contracts/common/utils/deployProxy");
const {ethers} = require("hardhat");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deployProxy('MockInsurance', deployments, save);

    await deployProxyMulti('MockSeniorTranche', 'RebaseToken', deployments, save, null);
    console.log("MockSeniorTranche created");

    await deployProxyMulti('MockJuniorTranche', 'RebaseToken', deployments, save, null);
    console.log("MockJuniorTranche created");

    let senior = await ethers.getContract('MockSeniorTranche');
    let junior = await ethers.getContract('MockJuniorTranche');
    let insurance = await ethers.getContract('MockInsurance');

    await (await senior.setExchanger(insurance.address)).wait();
    await (await senior.setName('Senior Tranche MOCK/MOCK', 'ST MOCk/MOCK')).wait();

    await (await junior.setExchanger(insurance.address)).wait();
    await (await junior.setName('Junior Tranche MOCK/MOCK', 'ST MOCk/MOCK')).wait();

};

module.exports.tags = ['MockInsurance'];
