const {sharedBeforeEach} = require("@overnight-contracts/common/utils/sharedBeforeEach");
const hre = require("hardhat");
const {ethers, deployments} = require("hardhat");
const {
    transferETH,
    transferUSDPlus,
    execTimelock,
    getContract,
    getERC20
} = require("@overnight-contracts/common/utils/script-utils");
const {toE18, toE6} = require("@overnight-contracts/common/utils/decimals");
const ERC20 = require("@overnight-contracts/common/utils/abi/IERC20.json");
const {DEFAULT} = require("@overnight-contracts/common/utils/assets");
const {expect} = require("chai");
const {abi: veConeAbi} = require("../artifacts/@openzeppelin/contracts/token/ERC721/IERC721.sol/IERC721.json");


describe("Transfer veCone", function () {


    let strategy;
    let veCone;
    let coneVoter;

    sharedBeforeEach("deploy", async () => {
        await hre.run("compile");

        await deployments.fixture(['StrategyUsdPlusWbnb', 'StrategyUsdPlusWbnbSetting']);

        strategy = await ethers.getContract('StrategyUsdPlusWbnb');

        let owner = '0x12a79E67ed7f4fd0a0318d331941800898DAB30d';

        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [owner],
        });

        const ownerSign = await hre.ethers.getSigner(owner);


        let veConeAbi = require("../artifacts/@openzeppelin/contracts/token/ERC721/IERC721.sol/IERC721.json").abi;
        veCone = await ethers.getContractAt(veConeAbi, '0xd0C1378c177E961D96c06b0E8F6E7841476C81Ef' , ownerSign);

        await veCone.transferFrom(owner, strategy.address, 2);
    });

    it('owner NFT is strategy', async function () {
        let owner = await veCone.ownerOf(2);
        expect(strategy.address).to.equal(owner);
    });

    it('vote', async function () {


        let pools = [
            '0x0Fe6CF7A2687c5BddF302C5CCea901BA0Bf71816',// BUSD/USD+
            '0xeC30Da6361905B8f3e4a93513D937dB992301276' // WBNB/USD+
        ];

        let weights = [
            20, // 20%
            80 // 80%
        ]

        await strategy.vote(pools, weights);

    });
});


describe("veCone increase Duration | Amounts", function () {


    let strategy;
    let veCone;
    let account;

    sharedBeforeEach("deploy", async () => {
        await hre.run("compile");

        await deployments.fixture(['StrategyUsdPlusWbnb', 'StrategyUsdPlusWbnbSetting']);

        const signers = await ethers.getSigners();
        account = signers[0];

        strategy = await ethers.getContract('StrategyUsdPlusWbnb');


    });

    it('increaseLockDuration', async function () {

        await strategy.increaseLockDuration();

    });
});
