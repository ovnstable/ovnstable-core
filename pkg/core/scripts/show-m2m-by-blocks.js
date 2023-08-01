const {getContract} = require("@overnight-contracts/common/utils/script-utils");
const {fromAsset} = require("@overnight-contracts/common/utils/decimals");

async function main() {

    let m2m = await getContract('Mark2Market');
    let usdPlus = await getContract('UsdPlusToken');



    let fromBlock = 107469280;
    let toBlock = 107469380;


    while (toBlock > fromBlock){

        console.log(`${fromBlock}/${toBlock}`);
        let nav = fromAsset(await m2m.totalNetAssets({blockTag: fromBlock}));
        console.log('nav:    ' + nav);
        let supply = fromAsset(await usdPlus.totalSupply({blockTag: fromBlock}));
        console.log('Supply: ' + supply);
        console.log('diff: ' +  (Number.parseFloat(supply) - Number.parseFloat(nav)));
        console.log('');

        fromBlock += 10;
    }

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

