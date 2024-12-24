const hre = require("hardhat");
const { getContract, showM2M, execTimelock, getPrice, initWallet, transferETH, getERC20ByAddress } = require("@overnight-contracts/common/utils/script-utils");
const path = require('path');

const {BASE, COMMON, BLAST} = require('@overnight-contracts/common/utils/assets');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {
    
    let fenixSwap = await getContract('StrategyFenixSwap', 'blast'); 

    await fenixSwap.claimMerkleTreeRewards(
        BLAST.distributor,
        ["0xa09A8e94FBaAC9261af8f34d810D96b923B559D2"], // users
        ["0x52f847356b38720B55ee18Cb3e094ca11C85A192"], // tokens
        ["122078259306390000000000"],                   // amounts
        [                                               // proofs
            [
                "0xf38d7b0878d90acb6530ff7cfded82d16cd0a52d0be51f898d3978d49f720d95",
                "0x08f959888057ea920ff82427b1c663d05db8987f274468431b292c817c7ad880",
                "0xa6382dbf23d9d3daa0b618e2798587db174bb272fbb6029385813ff8b6833e9a",
                "0xdb3cbe21f9db28ad2fa750c23b45c6c28a69e5f9e97c8b84da8e6f9c7512f386",
                "0x95100f186316459bbc1b643dec478706b62ed9859a02e5b2d7faec40935283b5",
                "0xe20c3c66fdb662cd04bbb5388fe41f06b0f8ac0cdc5edcf52191176825edf3be",
                "0xa7a8d0aa04019ba4f45cdd4ca8279958f65017ba417137bc12f8392339e220a9",
                "0x47a4a249a9b6212c22579b6077cfdf021e032056305fd25f1958bc3d5b32d0d8",
                "0x9865299c237c8dca031632161d7091fc6833a0934e0c458be810f73ab3acff18",
                "0x8cbce7ec7fe42c07c3773d46fc9f084e2d911155aaa541da50d28e122b01523b",
                "0x901d2d88bc2f2a8855f9141619d7b5e20b6c1d8c910eddfe02061d0b61c9b869",
                "0x52a1c8c2d71f11a4fa3aabbc04963abee59613965f930dd64a1ace0ba662d2ed",
                "0x0258757f4fbf2694a68ccf32ff33819685999899b9231b09a215c6ecf037a593",
                "0x477f5a1cee146117a1c0893a3b796780d4b1b0a951529a243aaa886cd99c1490",
                "0x2a635201dfc43a6d7d820fbd7d2c5957365d4f6822d74ab18779259b397bda61",
                "0x8448df1a14f7b08a2abd1986646575e3618e90d8ffab7bd467ba09418f0f06c7"
            ]
        ]
    );
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });