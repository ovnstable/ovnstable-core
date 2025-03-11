const hre = require("hardhat");
const { getContract, showM2M, execTimelock, getPrice, initWallet, transferETH, getERC20ByAddress } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal, testUsdPlus, testStrategy } = require("@overnight-contracts/common/utils/governance");
const { Roles } = require("@overnight-contracts/common/utils/roles");
const path = require('path');
const { prepareEnvironment } = require("@overnight-contracts/common/utils/tests");
const { ethers } = require("hardhat");
// const { strategyMorphoAlpha } = require("@overnight-contracts/strategies-base/deploy/22_strategy_morpho_alpha");
// const { strategyMorphoBeta } = require("@overnight-contracts/strategies-base/deploy/24_strategy_morpho_beta");
const {BASE, COMMON} = require('@overnight-contracts/common/utils/assets');
const {getImplementationAddress} = require('@openzeppelin/upgrades-core');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {

    let wallet = await initWallet();
    // await transferETH(1, wallet.address);

    // if (hre.network.name === 'localhost') {
    //     // if (((hre.ovn && hre.ovn.stand) || process.env.STAND).startsWith('zksync')) {
    //     //     hre.ethers.provider = new hre.ethers.providers.JsonRpcProvider('http://localhost:8011')
    //     // } else {
    //     hre.ethers.provider = new hre.ethers.providers.JsonRpcProvider('http://localhost:8545')
    //     // }
    // }

    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: ["0x086dFe298907DFf27BD593BD85208D57e0155c94"],
    });

    // await transferETH(1, "0x086dFe298907DFf27BD593BD85208D57e0155c94");

    const account3 = await hre.ethers.getSigner("0x086dFe298907DFf27BD593BD85208D57e0155c94");
    

    // let morphoAlpha = await getContract('StrategyMorphoAlpha', 'base');
    // let morphoBeta = await getContract('StrategyMorphoBeta', 'base'); 
    // let morphoDirect = await getContract('StrategyMorphoDirectUsdc', 'base_usdc');
    let morphoDirect = await hre.ethers.getContractAt(STRATEGY_ABI, '0x26C604e786601d838f0450910C7001646aCBf99E');
    
    // let well = await getERC20ByAddress(BASE.well, wallet.address);
    // let usdc = await getERC20ByAddress(BASE.usdc, wallet.address);
    let morphoToken = await getERC20ByAddress(BASE.morphoToken, wallet.address);


    // console.log("direct morphoToken", (await morphoToken.balanceOf(morphoDirect.address)).toString());
    // console.log("treasury morphoToken", (await morphoToken.balanceOf(COMMON.rewardWallet)).toString());



    let dataDirect = ["0x6b89026a0000000000000000000000005400dbb270c956e8985184335a1c62aca6ce133300000000000000000000000026c604e786601d838f0450910c7001646acbf99e000000000000000000000000baa5cc21fd487b8fcc2f632f3f4e8d37262a08420000000000000000000000000000000000000000000001d896d590fce3280bd300000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000011e74fadc11b104e738aacdda110049ea35afdd128408f32f7441d7fcb1f679ff4479af3bf342682754299d616b6abc715142ece634896216386655804d635f22ec9c9782ad8005e34fac2861a0b970496678db7f59b73dc16b8baa63eb3503e101fd4136e99db9b79d0c710f553d7a04c03f7b25df101cf639d0fdab48ca65108905bd143a08715c069bb683ce398f81a8ec59b4784daa4a62816b327d0977f1423157480fd087e6cd2d51fda1337aaa20fc2424b448c5b6cd3683d738aaaa177a0d1079d181f9462c572d19ec4d3e4d086fffa8cfed6e9790a08a615129bef136d9ab221a861272167b718beddd859206fa808cc4a928509c4a84ce0048bfb78ee71b384ce4be2283e40971837f51b3db2b226b0611e7fef3890da17116977e41a61ca9b34402ad5f96c5052b6f87d9b725119e8bfc4ba14f2410748447e47a7d1c2138a54a5ecf15d61b04c4623e81e58836faa9cf1b35a35dc9ffbb0cc9f4447a460c27d9c35637f5f7dc82efa061724334052d8bd0262fecda23f83bc552dc8f9f31c5e9c7315c39f375147921a16c05e79870940a3000a51b221e9c7c77e8af0d35d0952af76b5c00507e9ff8911e6f1f62ef51fbbc7619188a4bde42ffd1552b50ee50f10823410ac5d799f16435a675b639d5fc2c1b0f917ce45ccd4ac6452c946e34d54d19d26a3d5c40d4eb88f3ae9f65e56f1a51195f03bcf63b40037476f7d0da4d1bc8dbe92eacddf4b8182815ce83201b2634964b4f32d9d80ac"]

    // let dataBeta = ["0x6b89026a0000000000000000000000005400dbb270c956e8985184335a1c62aca6ce1333000000000000000000000000e1d2e5d59f8802b0249ea12d9ac94249d6bff17c000000000000000000000000833589fcd6edb6e08f4c7c32d4f71b54bda02913000000000000000000000000000000000000000000000000000000009522bc7000000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000be251b0c2ed1c7ca890d0a2f632f3fe46ad25e6c35b6e1fd3b2307f37ea7576e9c9b16d786fda5f26f1e76f0361953fa080d162153f536db4a8ac286b69a92bb64c1a9c0e7da0950ef9f7cc4b81481a7722bae43b33e8a211cc3b8fbae5f3f28d00feec6ba1f488814a00917df08b30618869653dabadf72b920c942725462af042caefa463f6cca66f540df71fdbcb21338c22ec003031403907a31ef659fa1669688c5627086f09a253a5a52ed1d6f3c9ceea09564d2d3ce6a24c2e35987b65bdccce1391d9f2c8f8fb80722fc794f5b4f71ed8a653f100d6c958591646a9148939bb11439dcb48cb9c4d4ca1317c8fb32b7f3fc34d7c0a770444a6d2d433a74756fc4e79171a8c8f1077d218283c9fd1c765d7e29c02e1a6a44cc218e67b7167b036b179c60e19dcb8ba3fd3350c2680272b4513baa8c18b1a7636673054d8171b88484e4b5afd10033a6ffeb502eba972af3d7d6773d8e9d7712dc4bd0a5a"]
    // addProposalItem(morphoAlpha, 'claimMerkleTreeRewards', [COMMON.rewardWallet, dataAlpha, BASE.morphoChainAgnosticBundler]);
    // addProposalItem(morphoBeta, 'claimMerkleTreeRewards', [COMMON.rewardWallet, dataBeta, BASE.morphoChainAgnosticBundler]);
    
    // await morphoAlpha.connect(account3).claimMerkleTreeRewards(COMMON.rewardWallet, dataAlpha, BASE.morphoChainAgnosticBundler);





    await morphoDirect.claimMerkleTreeRewards(COMMON.rewardWallet, dataDirect, BASE.morphoChainAgnosticBundler);
    // await morphoDirect.connect(account3).claimMerkleTreeRewards(COMMON.rewardWallet, dataDirect, BASE.morphoChainAgnosticBundler);



    
    // await morphoBeta.connect(wallet).claimMerkleTreeRewards(COMMON.rewardWallet, dataBeta, BASE.morphoChainAgnosticBundler);


    console.log("direct morphoToken", (await morphoToken.balanceOf(morphoDirect.address)).toString());
    console.log("treasury morphoToken", (await morphoToken.balanceOf(COMMON.rewardWallet)).toString());
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });


    STRATEGY_ABI = [
        {
          "inputs": [],
          "stateMutability": "nonpayable",
          "type": "constructor"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": false,
              "internalType": "address",
              "name": "previousAdmin",
              "type": "address"
            },
            {
              "indexed": false,
              "internalType": "address",
              "name": "newAdmin",
              "type": "address"
            }
          ],
          "name": "AdminChanged",
          "type": "event"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": true,
              "internalType": "address",
              "name": "beacon",
              "type": "address"
            }
          ],
          "name": "BeaconUpgraded",
          "type": "event"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": false,
              "internalType": "uint8",
              "name": "version",
              "type": "uint8"
            }
          ],
          "name": "Initialized",
          "type": "event"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": false,
              "internalType": "address",
              "name": "value",
              "type": "address"
            }
          ],
          "name": "PortfolioManagerUpdated",
          "type": "event"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": false,
              "internalType": "uint256",
              "name": "amount",
              "type": "uint256"
            }
          ],
          "name": "Reward",
          "type": "event"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": true,
              "internalType": "bytes32",
              "name": "role",
              "type": "bytes32"
            },
            {
              "indexed": true,
              "internalType": "bytes32",
              "name": "previousAdminRole",
              "type": "bytes32"
            },
            {
              "indexed": true,
              "internalType": "bytes32",
              "name": "newAdminRole",
              "type": "bytes32"
            }
          ],
          "name": "RoleAdminChanged",
          "type": "event"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": true,
              "internalType": "bytes32",
              "name": "role",
              "type": "bytes32"
            },
            {
              "indexed": true,
              "internalType": "address",
              "name": "account",
              "type": "address"
            },
            {
              "indexed": true,
              "internalType": "address",
              "name": "sender",
              "type": "address"
            }
          ],
          "name": "RoleGranted",
          "type": "event"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": true,
              "internalType": "bytes32",
              "name": "role",
              "type": "bytes32"
            },
            {
              "indexed": true,
              "internalType": "address",
              "name": "account",
              "type": "address"
            },
            {
              "indexed": true,
              "internalType": "address",
              "name": "sender",
              "type": "address"
            }
          ],
          "name": "RoleRevoked",
          "type": "event"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": false,
              "internalType": "uint256",
              "name": "swapSlippageBP",
              "type": "uint256"
            },
            {
              "indexed": false,
              "internalType": "uint256",
              "name": "navSlippageBP",
              "type": "uint256"
            },
            {
              "indexed": false,
              "internalType": "uint256",
              "name": "stakeSlippageBP",
              "type": "uint256"
            }
          ],
          "name": "SlippagesUpdated",
          "type": "event"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": false,
              "internalType": "uint256",
              "name": "amount",
              "type": "uint256"
            }
          ],
          "name": "Stake",
          "type": "event"
        },
        {
          "anonymous": false,
          "inputs": [],
          "name": "StrategyUpdatedFee",
          "type": "event"
        },
        {
          "anonymous": false,
          "inputs": [],
          "name": "StrategyUpdatedLimit",
          "type": "event"
        },
        {
          "anonymous": false,
          "inputs": [],
          "name": "StrategyUpdatedParams",
          "type": "event"
        },
        {
          "anonymous": false,
          "inputs": [],
          "name": "StrategyUpdatedTreasury",
          "type": "event"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": false,
              "internalType": "uint256",
              "name": "amount",
              "type": "uint256"
            },
            {
              "indexed": false,
              "internalType": "uint256",
              "name": "amountReceived",
              "type": "uint256"
            }
          ],
          "name": "Unstake",
          "type": "event"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": true,
              "internalType": "address",
              "name": "implementation",
              "type": "address"
            }
          ],
          "name": "Upgraded",
          "type": "event"
        },
        {
          "inputs": [],
          "name": "DEFAULT_ADMIN_ROLE",
          "outputs": [
            {
              "internalType": "bytes32",
              "name": "",
              "type": "bytes32"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "PORTFOLIO_AGENT_ROLE",
          "outputs": [
            {
              "internalType": "bytes32",
              "name": "",
              "type": "bytes32"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "PORTFOLIO_MANAGER",
          "outputs": [
            {
              "internalType": "bytes32",
              "name": "",
              "type": "bytes32"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "balance",
          "outputs": [
            {
              "internalType": "uint256",
              "name": "",
              "type": "uint256"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "_beneficiary",
              "type": "address"
            },
            {
              "internalType": "bytes[]",
              "name": "data",
              "type": "bytes[]"
            },
            {
              "internalType": "address",
              "name": "chainAgnosticBundler",
              "type": "address"
            }
          ],
          "name": "claimMerkleTreeRewards",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "_to",
              "type": "address"
            }
          ],
          "name": "claimRewards",
          "outputs": [
            {
              "internalType": "uint256",
              "name": "",
              "type": "uint256"
            }
          ],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "fee",
          "outputs": [
            {
              "internalType": "uint256",
              "name": "",
              "type": "uint256"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "bytes32",
              "name": "role",
              "type": "bytes32"
            }
          ],
          "name": "getRoleAdmin",
          "outputs": [
            {
              "internalType": "bytes32",
              "name": "",
              "type": "bytes32"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "bytes32",
              "name": "role",
              "type": "bytes32"
            },
            {
              "internalType": "address",
              "name": "account",
              "type": "address"
            }
          ],
          "name": "grantRole",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "bytes32",
              "name": "role",
              "type": "bytes32"
            },
            {
              "internalType": "address",
              "name": "account",
              "type": "address"
            }
          ],
          "name": "hasRole",
          "outputs": [
            {
              "internalType": "bool",
              "name": "",
              "type": "bool"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "initialize",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "limit",
          "outputs": [
            {
              "internalType": "uint256",
              "name": "",
              "type": "uint256"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "liquidationValue",
          "outputs": [
            {
              "internalType": "uint256",
              "name": "",
              "type": "uint256"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "marketId",
          "outputs": [
            {
              "internalType": "Id",
              "name": "",
              "type": "bytes32"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "marketParams",
          "outputs": [
            {
              "internalType": "address",
              "name": "loanToken",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "collateralToken",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "oracle",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "irm",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "lltv",
              "type": "uint256"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "morpho",
          "outputs": [
            {
              "internalType": "contract IMorpho",
              "name": "",
              "type": "address"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "morphoToken",
          "outputs": [
            {
              "internalType": "contract IERC20",
              "name": "",
              "type": "address"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "name",
          "outputs": [
            {
              "internalType": "string",
              "name": "",
              "type": "string"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "navSlippageBP",
          "outputs": [
            {
              "internalType": "uint256",
              "name": "",
              "type": "uint256"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "netAssetValue",
          "outputs": [
            {
              "internalType": "uint256",
              "name": "",
              "type": "uint256"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "portfolioManager",
          "outputs": [
            {
              "internalType": "address",
              "name": "",
              "type": "address"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "proxiableUUID",
          "outputs": [
            {
              "internalType": "bytes32",
              "name": "",
              "type": "bytes32"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "bytes32",
              "name": "role",
              "type": "bytes32"
            },
            {
              "internalType": "address",
              "name": "account",
              "type": "address"
            }
          ],
          "name": "renounceRole",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "bytes32",
              "name": "role",
              "type": "bytes32"
            },
            {
              "internalType": "address",
              "name": "account",
              "type": "address"
            }
          ],
          "name": "revokeRole",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "roleManager",
          "outputs": [
            {
              "internalType": "contract IRoleManager",
              "name": "",
              "type": "address"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "uint256",
              "name": "_fee",
              "type": "uint256"
            }
          ],
          "name": "setFee",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "uint256",
              "name": "_limit",
              "type": "uint256"
            }
          ],
          "name": "setLimit",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "components": [
                {
                  "internalType": "address",
                  "name": "usdc",
                  "type": "address"
                },
                {
                  "internalType": "address",
                  "name": "morpho",
                  "type": "address"
                },
                {
                  "internalType": "Id",
                  "name": "marketId",
                  "type": "bytes32"
                },
                {
                  "components": [
                    {
                      "internalType": "address",
                      "name": "loanToken",
                      "type": "address"
                    },
                    {
                      "internalType": "address",
                      "name": "collateralToken",
                      "type": "address"
                    },
                    {
                      "internalType": "address",
                      "name": "oracle",
                      "type": "address"
                    },
                    {
                      "internalType": "address",
                      "name": "irm",
                      "type": "address"
                    },
                    {
                      "internalType": "uint256",
                      "name": "lltv",
                      "type": "uint256"
                    }
                  ],
                  "internalType": "struct MarketParams",
                  "name": "marketParams",
                  "type": "tuple"
                },
                {
                  "internalType": "address",
                  "name": "treasury",
                  "type": "address"
                },
                {
                  "internalType": "uint256",
                  "name": "fee",
                  "type": "uint256"
                },
                {
                  "internalType": "uint256",
                  "name": "limit",
                  "type": "uint256"
                },
                {
                  "internalType": "address",
                  "name": "wellToken",
                  "type": "address"
                },
                {
                  "internalType": "address",
                  "name": "morphoToken",
                  "type": "address"
                }
              ],
              "internalType": "struct StrategyMorphoDirect.StrategyParams",
              "name": "params",
              "type": "tuple"
            }
          ],
          "name": "setParams",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "uint256",
              "name": "_swapSlippageBP",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "_navSlippageBP",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "_stakeSlippageBP",
              "type": "uint256"
            }
          ],
          "name": "setSlippages",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "string",
              "name": "_name",
              "type": "string"
            }
          ],
          "name": "setStrategyName",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "_portfolioManager",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "_roleManager",
              "type": "address"
            }
          ],
          "name": "setStrategyParams",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "_treasury",
              "type": "address"
            }
          ],
          "name": "setTreasury",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "_asset",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "_amount",
              "type": "uint256"
            }
          ],
          "name": "stake",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "stakeSlippageBP",
          "outputs": [
            {
              "internalType": "uint256",
              "name": "",
              "type": "uint256"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "bytes4",
              "name": "interfaceId",
              "type": "bytes4"
            }
          ],
          "name": "supportsInterface",
          "outputs": [
            {
              "internalType": "bool",
              "name": "",
              "type": "bool"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "swapSlippageBP",
          "outputs": [
            {
              "internalType": "uint256",
              "name": "",
              "type": "uint256"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "_asset",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "_amount",
              "type": "uint256"
            },
            {
              "internalType": "address",
              "name": "_beneficiary",
              "type": "address"
            },
            {
              "internalType": "bool",
              "name": "_targetIsZero",
              "type": "bool"
            }
          ],
          "name": "unstake",
          "outputs": [
            {
              "internalType": "uint256",
              "name": "",
              "type": "uint256"
            }
          ],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "newImplementation",
              "type": "address"
            }
          ],
          "name": "upgradeTo",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "newImplementation",
              "type": "address"
            },
            {
              "internalType": "bytes",
              "name": "data",
              "type": "bytes"
            }
          ],
          "name": "upgradeToAndCall",
          "outputs": [],
          "stateMutability": "payable",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "usdcToken",
          "outputs": [
            {
              "internalType": "contract IERC20",
              "name": "",
              "type": "address"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "wellToken",
          "outputs": [
            {
              "internalType": "contract IERC20",
              "name": "",
              "type": "address"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        }
      ]