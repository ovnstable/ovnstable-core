const hre = require("hardhat");
const { getContract, showM2M, execTimelock, getPrice, initWallet, transferETH, getERC20ByAddress } = require("@overnight-contracts/common/utils/script-utils");
const path = require('path');

const {BASE, COMMON} = require('@overnight-contracts/common/utils/assets');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {
    strategyAddress = "";

    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: ["0x086dFe298907DFf27BD593BD85208D57e0155c94"],
    });

    const account3 = await hre.ethers.getSigner("0x086dFe298907DFf27BD593BD85208D57e0155c94");
    
    // let morphoBeta = await getContract('StrategyMorphoBeta', 'base'); 
    let fenixSwap = await getContract('StrategyFenixSwap', 'blast'); 


    let data = [
        ""
    ]
   
    await fenixSwap.connect(account3).claimMerkleTreeRewards(strategyAddress, data, BASE.morphoChainAgnosticBundler);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });


    // (?) через что меняем деньги? Через этот OpenOcean?

