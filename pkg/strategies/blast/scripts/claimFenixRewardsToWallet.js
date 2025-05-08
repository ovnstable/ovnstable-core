const hre = require("hardhat");
const { getContract, showM2M, execTimelock, getPrice, initWallet, transferETH, getERC20ByAddress } = require("@overnight-contracts/common/utils/script-utils");
const path = require('path');

const {BASE, COMMON, BLAST} = require('@overnight-contracts/common/utils/assets');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {
    let fenixSwap = await getContract('StrategyFenixSwap', 'blast'); 
    let gas = {
        gasLimit: 20000000,
        // maxFeePerGas: "38000000",
        // maxPriorityFeePerGas: "1300000",
    }

    const unitAddress = "0xb8f55cdd8330b9bf9822137Bc8A6cCB89bc0f055";
    const provider = new ethers.providers.JsonRpcProvider(
        "http://localhost:8545"
    );
    await provider.send("hardhat_impersonateAccount", [unitAddress]);
    const unitAccount = await provider.getSigner(unitAddress); 

    // await transferETH(10, "0x086dFe298907DFf27BD593BD85208D57e0155c94");

    let usdb = await getERC20ByAddress(BLAST.usdb);
    let amountFrom = await usdb.balanceOf(COMMON.rewardWallet);
    console.log("DEBUG: amountFrom =", amountFrom.toString());

    await fenixSwap.connect(unitAccount).claimMerkl(
        ["0xa09A8e94FBaAC9261af8f34d810D96b923B559D2"], // users
        ["0x52f847356b38720B55ee18Cb3e094ca11C85A192"], // tokens
        ["788941545730620000000000"],                   // amounts
        [                                               // proofs
            [
                "0x273164c7b1ec27a47c767e2c03d8debf5271252abed1bb9276c6a5244dd21f87",
                "0xf637bca3cb73d6a3b86075a09841e5983caf1bdfc2a5e1d6a6098c3389911a4e",
                "0x9f17d4d85d770c720e4914cbff660ae53405395051a0505186b5588f9d4df1a8",
                "0x705b37094ed7079a28ac6b674ca48a16cff42c9fe24d1dad3821153e88483c12",
                "0x8fdc0371db07a120e387699fa4dfd0f8194058add846f7d1e3b931e4707d9527",
                "0x2ece8b46e3dc77af2fad621bdf392baa9d10065782eca5c15fee626e02cbaacb",
                "0x0a1f42b867349cf82c97e8868cc826463483cbb26c706c5e2afeb70733b7e2d5",
                "0x452a053b3b09978f3be71983c385777466c931e5275d88a601bec96fa4d17ff5",
                "0x424c7e7f65359c63325a9e532d29d461e39e12ff9079f4d5f4c0aee0ab8eeccd",
                "0x89c393c5bb2bed91d7d04c715e1e1003a344e6e77f6e28fa4ec6f55d5e062427",
                "0xc66db52ef6e0a13a2831cd18e8c403cd3362a1456265371886ec1e7b003a6620",
                "0x63c22597b9d2b581da6397d5868668da8338c0762cff7862f08b31f9e56c7aa4",
                "0x971ad6af45bb44a286b7a6cc14d05914b1f250225207da3964e5eb1b74430958",
                "0x3a6b4e3d74aaa12975a0ae6bf307830a2d0acc2b8dfade190eee172937570240",
                "0xfc1a70f118a400254631ef6068856e54a29116bd1dd24dfb9fb6ffaa8de3c24c",
                "0xa21755fb97cab698178abc57f80c5841b740c5975c1017dda508fab3861bbe67",
                "0x5c66b925b9a03dabdf8e62f0c9429f372fbc42430665574adc384b47025cd2e2"
            ]
        ]
    , gas);

    let amountTo = await usdb.balanceOf(COMMON.rewardWallet);
    console.log("DEBUG: amountTo =", amountTo.toString());
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });