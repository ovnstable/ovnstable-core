const {verify } = require("@overnight-contracts/common/utils/verify-utils");
const {getContract, initWallet, getERC20ByAddress} = require("@overnight-contracts/common/utils/script-utils");
const {Roles} = require("@overnight-contracts/common/utils/roles");
const hre = require("hardhat");
const {ethers} = require("hardhat");

async function main() {

    let strategy = await getContract('StrategyAequinoxBusdUsdcUsdt', 'bsc');
    let token = await getContract('AeqDelayRecovery', 'bsc');

    let wallet = await initWallet();

    let lockToken = await getERC20ByAddress('0xaCC31d29022C8Eb2683597bF4c07De228Ed9EA07', wallet);

    await (await strategy.setAeqDelayRecovery(token.address)).wait();
    console.log('setAeqDelayRecovery done()');

    await (await token.transfer('0x3265F8fbfD838D62dA762b36F3b398281B6e4005', await token.balanceOf(wallet.address))).wait();
    console.log('token transfer to airdrop wallet done()');


}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

