const {expect} = require("chai");
const chai = require("chai");
const {deployments, ethers, getNamedAccounts} = require('hardhat');
const expectRevert = require("@overnight-contracts/common/utils/expectRevert");

const hre = require("hardhat");
chai.use(require('chai-bignumber')());
const {solidity} = require("ethereum-waffle");
const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
chai.use(solidity);

const TIMELOCK_ABI = require("./abi/TIMELOCK_ABI.json");
const {ZERO_ADDRESS} = require("@openzeppelin/test-helpers/src/constants");

describe("AgentTimelock", function () {


    let account;
    let secondUser;
    let timelock;
    let gateway;
    let gnosisSafe;
    let exchange;

    beforeEach(async () => {
        await hre.run("compile");

        await deployments.fixture(['MockGateway', 'MockGnosisSafe']);

        let addresses = await ethers.getSigners();
        account = addresses[0];
        secondUser = addresses[1];

        console.log(`Account: ${account.address}`)
        console.log(`SecondUser: ${secondUser.address}`)

        await deployments.deploy('MockGateway', {
            from: account.address,
            args: [],
            log: true,
        });

        await deployments.deploy('MockGnosisSafe', {
            from: account.address,
            args: [account.address],
            log: true,
        });

        await deployments.deploy('MockContract', {
            from: account.address,
            args: [],
            log: true,
        });


        gateway = await ethers.getContract('MockGateway');
        gnosisSafe = await ethers.getContract('MockGnosisSafe');
        exchange = await ethers.getContract('MockContract')


    });


    describe('initialize', () => {

        beforeEach(async () => {
            await deployTimelock(gateway.address, account.address, account.address);
        });

        it('ovnAgent', async () => {
            expect(account.address).to.eq(await timelock.ovnAgent());
        });

        it('motherTimelock', async () => {
            expect(account.address).to.eq(await timelock.motherTimelock());
        });

        it('gateway', async () => {
            expect(gateway.address).to.eq(await timelock.gateway());
        });

        it('motherChainId', async () => {
            expect("10").to.eq(await timelock.motherChainId());
        });

        it('newImplementation is not zero', async () => {
            expect(await timelock.newImplementation()).to.not.empty;
        });
    });




    describe('_onlyAgent', () => {

        beforeEach(async () => {
            await deployTimelock(gateway.address, account.address, account.address);
        });

        it('success', async () => {
            await timelock._onlyAgent();
        });

        it('revert', async () => {
            await expectRevert(timelock.connect(secondUser)._onlyAgent(), 'only ovnAgent');
        });

    });


    describe('_onlyAgentMembers', () => {

        it('ovnAgent: success', async () => {
            await deployTimelock(gateway.address, account.address, account.address);

            await timelock._onlyAgentMembers();
        });

        it('ovnAgentMembers: success', async () => {
            await deployTimelock(gateway.address, account.address, gnosisSafe.address);

            await gnosisSafe.addOwner(secondUser.address);
            await timelock.connect(secondUser)._onlyAgentMembers();
        });

        it('revert', async () => {
            await deployTimelock(gateway.address, account.address, gnosisSafe.address);

            await expectRevert(timelock.connect(secondUser)._onlyAgentMembers(), 'only ovnAgent or ovnAgentMember');
        });

    });


    describe('isMotherChain', ()=>{


       it('true', async ()=>{
           await deployTimelock(ZERO_ADDRESS, account.address, gnosisSafe.address);
           expect(true).to.eq(await timelock.isMotherChain());
       });

        it('false', async ()=>{
            await deployTimelock(gateway.address, account.address, gnosisSafe.address);
            expect(false).to.eq(await timelock.isMotherChain());
        });

    });

    describe('axelar disabled: execute', ()=>{


        let commandId;
        let sourceChain;
        let sourceAddress;
        let payload;

        beforeEach(async ()=>{
            await deployTimelock(ZERO_ADDRESS, account.address, account.address);
            timelock = await ethers.getContractAt(TIMELOCK_ABI, timelock.address);

            commandId = ethers.utils.formatBytes32String('test');
            sourceChain = "10";
            sourceAddress = secondUser.address;
            payload = ethers.utils.defaultAbiCoder.encode(['uint256', 'address'], [0, ZERO_ADDRESS]);
        });


        it('revert: not motherChain', async () => {

            await deployTimelock(null, account.address, account.address);
            timelock = await ethers.getContractAt(TIMELOCK_ABI, timelock.address);

            await expectRevert(timelock.execute(commandId, sourceChain, sourceAddress, payload), 'not motherChain')

        });
    });

    describe('axelar enabled: execute', () => {

        let commandId;
        let sourceChain;
        let sourceAddress;
        let payload;

        beforeEach(async ()=>{
            await deployTimelock(gateway.address, account.address, account.address);
            timelock = await ethers.getContractAt(TIMELOCK_ABI, timelock.address);

            commandId = ethers.utils.formatBytes32String('test');
            sourceChain = "10";
            sourceAddress = secondUser.address;
            payload = ethers.utils.defaultAbiCoder.encode(['uint256', 'address'], [0, ZERO_ADDRESS]);
        });

        it('revert: only gateway', async () => {
            await expectRevert(timelock.connect(secondUser).execute(commandId, sourceChain, sourceAddress, payload), 'only gateway')

        });

        // Can be fail if run in parallel because cannot parse custom error (NotApprovedByGateway)
        it('revert: gateway.validateContractCall', async () => {
            await expectRevert(gateway.send(commandId, sourceChain, sourceAddress, payload, timelock.address), 'VM Exception while processing transaction: reverted with custom error NotApprovedByGateway()')
        });

        it('revert: only motherTimelock', async () => {
            await gateway.setValidate(true);
            await expectRevert(gateway.send(commandId, sourceChain, sourceAddress, payload, timelock.address), 'only motherTimelock')

        });

        it('revert: only motherChainId', async () => {

            await gateway.setValidate(true);
            let sourceChain = "11";
            await expectRevert(gateway.send(commandId, sourceChain, sourceAddress, payload, timelock.address), 'only motherTimelock')

        });


        it('revert: setAddress is zero', async () => {

            await gateway.setValidate(true);
            await expectRevert(gateway.send(commandId, sourceChain, account.address, payload, timelock.address), 'setAddress is zero')
        });

        it('Action: SET_NEW_AGENT', async () => {

            await gateway.setValidate(true);

            payload = ethers.utils.defaultAbiCoder.encode(['uint256', 'address'], [0, secondUser.address]);
            let tx = await (await gateway.send(commandId, sourceChain, account.address, payload, timelock.address)).wait();

            expect(secondUser.address).to.eq(await timelock.ovnAgent())

            let event = await findEvent(tx, timelock, 'OvnAgentUpdated');
            expect(secondUser.address).to.eq(event.args.ovnAgent);
        });

        it('Action: UPGRADE_TIMELOCK', async () => {

            await gateway.setValidate(true);

            payload = ethers.utils.defaultAbiCoder.encode(['uint256', 'address'], [1, secondUser.address]);
            let tx = await (await gateway.send(commandId, sourceChain, account.address, payload, timelock.address)).wait();

            expect(secondUser.address).to.eq(await timelock.newImplementation())

            let event = await findEvent(tx, timelock, 'NewImplementationUpdate');
            expect(secondUser.address).to.eq(event.args.newImplementation);
        });


        // Pass Unknown action (ActionOnAgent) - invalid ID
        it('revert: Transaction reverted without a reason string', async () => {
            await gateway.setValidate(true);
            payload = ethers.utils.defaultAbiCoder.encode(['uint256', 'address'], [2, secondUser.address]);
            await expectRevert(gateway.send(commandId, sourceChain, account.address, payload, timelock.address), 'Transaction reverted without a reason string')

        });

    });


    describe('upgradeTo', ()=>{


        it('upgrade by axelar', async ()=>{

            await deployTimelock(gateway.address, account.address, account.address);
            timelock = await ethers.getContractAt(TIMELOCK_ABI, timelock.address);

            let newImplementation = await getTestTimelockImpl();

            let commandId = ethers.utils.formatBytes32String('test');
            let sourceChain = "10";
            let sourceAddress = account.address;
            let payload = ethers.utils.defaultAbiCoder.encode(['uint256', 'address'], [1, newImplementation]);

            await gateway.setValidate(true);
            await gateway.send(commandId, sourceChain, sourceAddress, payload, timelock.address);
            await timelock.upgradeTo(newImplementation);

            // TEST_VALUE should be exist after upgrade
            expect(10).to.eq(await timelock.TEST_VALUE())

        });
    });

    describe('schedule', () => {

        beforeEach(async () => {
            await deployTimelock(gateway.address, account.address, account.address);
        })

        let value = 0;
        let data = 0;
        let predecessor = ethers.utils.formatBytes32String("12");
        let salt = ethers.utils.formatBytes32String("32");
        let delay = 0;


        it('success send', async () => {
            await timelock.schedule(
                account.address,
                value,
                data,
                predecessor,
                salt,
                delay);
        });

        it('revert', async () => {
            await expectRevert(timelock.connect(secondUser).schedule(
                account.address,
                value,
                data,
                predecessor,
                salt,
                delay), 'only ovnAgent');
        });
    });


    async function deployTimelock(gateway, motherTimelock, ovnAgent) {

        let params = {
            args: [gateway, motherTimelock, ovnAgent, "10"]
        }

        await deployProxy('AgentTimelock', deployments, deployments.save, params);

        timelock = await ethers.getContract('AgentTimelock')
    }

    async function getTestTimelockImpl() {

        let impl = await deployments.deploy('TestAgentTimelock', {
            from: account.address,
            args: [],
            log: true,
        });

        return impl.address;
    }


    async function findEvent(receipt, abi, eventName){


        for (let value of receipt.logs) {
            try {
                let log = abi.interface.parseLog(value);

                if (log.name === eventName) {
                    return log;
                }
            } catch (e) {
            }
        }

        return null;

    }
});
