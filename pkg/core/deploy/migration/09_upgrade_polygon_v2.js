const { ethers } = require("hardhat");
const { getContract, execTimelock, initWallet, transferETH } = require("@overnight-contracts/common/utils/script-utils");
const sampleModule = require("@openzeppelin/hardhat-upgrades/dist/utils/deploy-impl");
const hre = require("hardhat");
const { getImplementationAddress } = require("@openzeppelin/upgrades-core");

module.exports = async ({ deployments }) => {
    const { save } = deployments;
    
    let wallet = await initWallet();
    await transferETH(1, wallet.address);

    let usdPlus = await getContract('UsdPlusToken');
    let factory = await ethers.getContractFactory('UsdPlusToken_polygonV2');

    console.log(`Current UsdPlusToken proxy: ${usdPlus.address}`);
    console.log(`Current implementation: ${await getImplementationAddress(ethers.provider, usdPlus.address)}`);

    let newImpl = await sampleModule.deployProxyImpl(hre, factory, {
        kind: 'uups'
    }, usdPlus.address);

    console.log(`New UsdPlusToken_polygonV2 implementation: ${newImpl.impl}`);

    if (hre.ovn.gov) {
        await execTimelock(async (timelock) => {
            await usdPlus.connect(timelock).upgradeTo(newImpl.impl);
            console.log(`Upgraded to V2 via timelock`);
        });
    }

    const artifact = await deployments.getExtendedArtifact('UsdPlusToken_polygonV2');
    await save('UsdPlusToken', {
        address: usdPlus.address,
        implementation: newImpl.impl,
        ...artifact,
    });

    console.log(`UsdPlusToken upgraded to V2`);
};

module.exports.tags = ['UpgradePolygonV2'];