const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const hre = require("hardhat");
const {ethers} = require("hardhat");
const {
    getContract,
    execTimelock,
    initWallet, getWalletAddress,
} = require("@overnight-contracts/common/utils/script-utils");
const {Roles} = require("@overnight-contracts/common/utils/roles");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    let wallet = await initWallet();
    console.log("wallet addr", wallet.address);

    let params = {args: ["USD+", "USD+", 6]};

    let usdPlus = (await ethers.getContract('UsdPlusToken')).connect(wallet);

    await execTimelock(async (timelock) => {
        await usdPlus.connect(timelock).grantRole(Roles.DEFAULT_ADMIN_ROLE, "0x66b439c0a695cc3ed3d9f50aa4e6d2d917659ffd")
        await usdPlus.connect(timelock).grantRole(Roles.DEFAULT_ADMIN_ROLE, "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266")
        await usdPlus.connect(timelock).setExchanger("0x66b439c0a695cc3ed3d9f50aa4e6d2d917659ffd");
    })

    await (await usdPlus.mint(wallet.address, "100000000")).wait()

    let balance = await usdPlus.balanceOf(wallet.address);
    console.log("our balance", balance.toString());

    await deployProxy('UsdPlusToken', deployments, save, params);

    let usdPlus2 = (await ethers.getContract('UsdPlusToken')).connect(wallet);
    let roleManager = await ethers.getContract('RoleManager');
    
    console.log('UsdPlusToken deploy done()');

    await (await usdPlus2.fix(roleManager.address)).wait();

    let curveAbi = [{"stateMutability":"nonpayable","type":"function","name":"add_liquidity","inputs":[{"name":"_pool","type":"address"},{"name":"_deposit_amounts","type":"uint256[3]"},{"name":"_min_mint_amount","type":"uint256"}],"outputs":[{"name":"","type":"uint256"}]}];

    let curveAddress = "0x58AC91f5BE7dC0c35b24B96B19BAc55FBB8E705e";

    await usdPlus.approve(curveAddress, "100000000");

    const curve = (await ethers.getContractAt(curveAbi, curveAddress, wallet.address)).connect(wallet);

    const poolAddress = "0xb34a7d1444a707349bc7b981b7f2e1f20f81f013";
    const depositAmounts = [100000000, 0, 0];
    const minMintAmount = "0"; 

    await (await curve.add_liquidity(poolAddress, depositAmounts, minMintAmount)).wait();


};

module.exports.tags = ['Curve'];