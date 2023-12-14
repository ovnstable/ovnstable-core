const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {
    getContract,
    getPrice,
    execTimelock,
    initWallet,
    convertWeights,
    showM2M, transferETH, getERC20ByAddress, transferAsset
} = require("@overnight-contracts/common/utils/script-utils");
const hre = require("hardhat");
const {ethers, upgrades, getNamedAccounts} = require("hardhat");
const sampleModule = require("@openzeppelin/hardhat-upgrades/dist/utils/deploy-impl");
const {Roles} = require("@overnight-contracts/common/utils/roles");
const {getImplementationAddress} = require("@openzeppelin/upgrades-core");
const {sharedBeforeEach, evmCheckpoint, evmRestore} = require("@overnight-contracts/common/utils/sharedBeforeEach");
const {fromAsset, toE6, toAsset} = require("@overnight-contracts/common/utils/decimals");
const {testUsdPlus} = require("@overnight-contracts/common/utils/governance");
const {BigNumber} = require("ethers");
const {createRandomWallet, prepareEnvironment} = require("@overnight-contracts/common/utils/tests");
const {ARBITRUM} = require("@overnight-contracts/common/utils/assets");
const {getEmptyOdosData} = require("@overnight-contracts/common/utils/odos-helper");

module.exports = async ({deployments}) => {


    let wallet = await initWallet();

    await transferETH(1, wallet.address);

    let testWallet = await createRandomWallet();

    let exchange = await getContract('Exchange');
    let usdPlus = await getContract('UsdPlusToken');
    let wrapped = await getContract('WrappedUsdPlusToken');
    let roleManager = await getContract('RoleManager');
    let market = await getContract('Market');



    console.log(await usdPlus.paused());
    console.log(await usdPlus.roleManager());
    console.log(await usdPlus.payoutManager());
    console.log((await usdPlus.totalSupply()).toString());

    await execTimelock(async (timelock)=>{
        await usdPlus.connect(timelock).upgradeTo('0x96aa0bBe4D0dea7C4AF4739c53dBFA0300262253');
        await usdPlus.connect(timelock).setRoleManager(roleManager.address);
        await roleManager.connect(timelock).grantRole(Roles.PORTFOLIO_AGENT_ROLE, timelock.address);
        await usdPlus.connect(timelock).unpause();
    })

    console.log(await usdPlus.paused());
    console.log(await usdPlus.roleManager());
    console.log(await usdPlus.payoutManager());
    console.log((await usdPlus.totalSupply()).toString());



};


module.exports.tags = ['Upgrade'];
