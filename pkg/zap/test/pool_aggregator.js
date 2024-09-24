const { expect } = require('chai');
const { deployments, ethers } = require('hardhat');
const { resetHardhatToLastBlock } = require('@overnight-contracts/common/utils/tests');
const BN = require('bn.js');
const hre = require('hardhat');
const { sharedBeforeEach } = require('@overnight-contracts/common/utils/sharedBeforeEach');

let name = "PoolAggregator";
let zapName = "PancakeCLZapBase";

describe('Testing aggregator', function() {
    let aggregator;
    let zap;

    sharedBeforeEach('deploy and setup', async () => {
        await hre.run('compile');
        await resetHardhatToLastBlock();
        await deployments.fixture([zapName]);
        // aggregator = await ethers.getContract(name);
        zap = await ethers.getContract(zapName);
        console.log('before done successfully');
    });

    it('get pools 1', async function() {
        let limit = 61;
        let offset = 0;
        let pools = await zap.fetchPools(limit, offset);
        await check(limit, pools);
    });

    async function check(pools) {
        for (let i = 0; i < pools.length; i++) {
            let pool = pools[i];
            expect(pool.poolId).to.not.equal(ethers.constants.AddressZero);
            expect(pool.token0.tokenId).to.not.equal(ethers.constants.AddressZero);
            expect(pool.token1.tokenId).to.not.equal(ethers.constants.AddressZero);
            expect(pool.tickSpacing).to.not.equal(0);
            expect(pool.fee).to.not.equal(0);
            expect(pool.gauge).to.not.equal(ethers.constants.AddressZero);
        }
    }
});
