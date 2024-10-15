const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {BASE, COMMON} = require('@overnight-contracts/common/utils/assets');
const {deploySection, settingSection, getContract, initWallet, transferETH } = require("@overnight-contracts/common/utils/script-utils");
const { Roles } = require('@overnight-contracts/common/utils/roles');

module.exports = async ({deployments}) => {
    const {save} = deployments;

    let wallet = await initWallet();

    // await transferETH(1, wallet.address);

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save, {
            factoryOptions: {
                signer: wallet
            }
        });
    });

    await settingSection('', async (strategy) => {
        await (await strategy.setParams(await getParams())).wait();
    }, wallet);
};

async function getParams() {
    return {
        pool: '0x8dd9751961621Fcfc394d90969E5ae0c5BAbE147',
        rewardSwapPool: '0xBE00fF35AF70E8415D0eB605a286D8A45466A4c1',
        tickRange: [0, 1],
        binSearchIterations: 20,
        swapSimulatorAddress: '',
        npmAddress: BASE.aerodromeNpm,
        aeroTokenAddress: BASE.aero,
        rewardSwapSlippageBP: 50
    };
}

module.exports.tags = ['StrategyAerodromeUsdc'];
