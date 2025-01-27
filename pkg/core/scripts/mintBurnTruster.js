const { getContract, getERC20 } = require('@overnight-contracts/common/utils/script-utils');
const { fromE18, fromE6, toE18, toE6, fromE8 } = require('@overnight-contracts/common/utils/decimals');
const { COMMON } = require('@overnight-contracts/common/utils/assets');

async function main() {
    let usdPlus = await getContract('UsdPlusToken', 'localhost');
    let token = await getERC20('usdPlus');

    console.log('trasury balance before', fromE18(await token.balanceOf(COMMON.rewardWallet, { blockTag: 14408619 })));
    console.log('pool balance before', fromE18(await token.balanceOf('0x147e7416d5988B097B3A1859eFECC2C5e04FDf96', { blockTag: 14408619 })));

    // await (
    //     await usdPlus.burnStuckTokensThruster(
    //         '0x147e7416d5988B097B3A1859eFECC2C5e04FDf96',
    //         '0x9030D5C596d636eEFC8f0ad7b2788AE7E9ef3D46',
    //         BigInt(1448 * 10 ** 18),
    //     )
    // ).wait();
    console.log('UsdPlusToken.mint done');
    console.log('trasury balance after', fromE18(await token.balanceOf(COMMON.rewardWallet)));
    console.log('pool balance after', fromE18(await token.balanceOf('0x147e7416d5988B097B3A1859eFECC2C5e04FDf96')));
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
