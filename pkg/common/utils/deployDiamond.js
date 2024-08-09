const {
    getContract,
    getBytecode,
    initWallet,
    getWalletAddress,
    execTimelock,
    getERC20ByAddress,
} = require('@overnight-contracts/common/utils/script-utils');
const { checkPermission } = require('@overnight-contracts/common/utils/permission');
const hre = require('hardhat');
const { Roles } = require('@overnight-contracts/common/utils/roles');
const { getPrice } = require('@overnight-contracts/common/utils/script-utils');
const { mergeABIs } = require('hardhat-deploy/dist/src/utils');
const path = require('path');
const fs = require('fs');
const { DeploymentsManager } = require('hardhat-deploy/dist/src/DeploymentsManager');
const { deployments, ethers } = require('hardhat');
const { isZkSync } = require('@overnight-contracts/common/utils/network');
const { createProposal } = require('@overnight-contracts/common/utils/governance');
const axios = require('axios');
const { ZERO_ADDRESS } = require('@openzeppelin/test-helpers/src/constants');
const { fromE18 } = require('@overnight-contracts/common/utils/decimals');

async function getRoleManagerAddress() {
    let roleManager = await getContract('RoleManager', process.env.STAND);
    return roleManager.address;
}

async function mergeABIFacets(facets) {
    let primaryABI = [];
    for (let i = 0; i < facets.length; i++) {
        let facet = facets[i];

        if (facet.interface) {
            let items = JSON.parse(facet.interface.format(ethers.utils.FormatTypes.json));
            primaryABI.push(...items);
        } else {
            console.log(`Facet: ${facet.name} not has field: interface`);
        }
    }

    return mergeABIs([primaryABI]);
}

async function deployDiamond(name, deployer) {
    // no need to deploy facets which not change
    let diamondCutFacet = await getOrDeploy('DiamondCutFacet', deployer, true);
    let diamondLoupeFacet = await getOrDeploy('DiamondLoupeFacet', deployer, true);

    try {
        let contract = await ethers.getContract(name);
        console.log(`Diamond: ${name} already deployed at ${contract.address}`);
        return contract;
    } catch (e) {
        const diamond = await deployments.deploy('Diamond', {
            from: deployer,
            args: [deployer, diamondCutFacet.address],
            log: true,
            skipIfAlreadyDeployed: false,
        });
        console.log(`Diamond: ${name} deployed at ` + diamond.address);

        const cut = [];
        cut.push({
            facetAddress: diamondLoupeFacet.address,
            action: FacetCutAction.Add,
            functionSelectors: getSelectors(await ethers.getContractFactory('DiamondLoupeFacet')),
        });

        const diamondCut = await ethers.getContractAt('IDiamondCut', diamond.address);
        await (await diamondCut.diamondCut(cut, ethers.constants.AddressZero, '0x')).wait();
        console.log('Add DiamondLoupeFacet to Dimond');

        const facets = [];
        facets.push(await ethers.getContractFactory('DiamondCutFacet'));
        facets.push(await ethers.getContractFactory('DiamondLoupeFacet'));
        let abi = await mergeABIFacets(facets);
        await deployments.delete('Diamond');
        delete diamond['abi'];

        await deployments.save(name, {
            address: diamond.address,
            abi: abi,
            ...diamond,
        });
        return await ethers.getContract(name);
    }
}

async function getOrDeploy(name, deployer, skipIfAlreadyDeployed) {
    return await deployments.deploy(name, {
        from: deployer,
        args: [],
        log: true,
        skipIfAlreadyDeployed: skipIfAlreadyDeployed,
    });
}

async function prepareCut(facetNames, address) {
    console.log(`Prepare cut for Diamond: ${address} ...`);

    let diamondFacets = ['DiamondCutFacet', 'DiamondLoupeFacet'];

    let facetFactories = await getFacetFactories(facetNames);
    facetFactories.push(...(await getFacetFactories(diamondFacets)));

    const oldSelectors = [];
    const oldSelectorsFacetAddress = {};

    const newSelectors = [];
    const newSelectorsFacetAddress = {};
    const newSelectorsFacetNames = {};

    const facetCuts = [];
    let printItems = [];

    let oldFacets = await getCurrentFacets(address);
    for (const oldFacet of oldFacets) {
        for (const selector of oldFacet.functionSelectors) {
            oldSelectors.push(selector);
            oldSelectorsFacetAddress[selector] = oldFacet.facetAddress;
        }
    }
    const newFacets = await getFacets(facetNames);
    for (const newFacet of newFacets) {
        for (const selector of newFacet.functionSelectors) {
            newSelectors.push(selector);
            newSelectorsFacetAddress[selector] = newFacet.facetAddress;
            newSelectorsFacetNames[selector] = newFacet.facetName;
        }
    }
    for (let newSelector of newSelectors) {
        // Method exist in old facet and new facet
        if (oldSelectors.indexOf(newSelector) >= 0) {
            let oldFacetAddress = oldSelectorsFacetAddress[newSelector].toLowerCase();
            let newFacetAddress = newSelectorsFacetAddress[newSelector].toLowerCase();

            if (oldFacetAddress === newFacetAddress) {
                // Update not needed because bytecode not changed

                printItems.push({
                    name: newSelectorsFacetNames[newSelector],
                    address: oldFacetAddress,
                    selector: newSelector,
                    method: getFunctionNameBySelector(facetFactories, newSelector),
                    action: 'Nothing',
                });
            } else {
                // Update method by replace on a new address Facet
                facetCuts.push({
                    facetAddress: newFacetAddress,
                    functionSelectors: newSelector,
                    action: FacetCutAction.Replace,
                });

                printItems.push({
                    name: newSelectorsFacetNames[newSelector],
                    address: newFacetAddress,
                    selector: newSelector,
                    method: getFunctionNameBySelector(facetFactories, newSelector),
                    action: getFacetActionName(FacetCutAction.Replace),
                });
            }
        } else {
            let newFacetAddress = newSelectorsFacetAddress[newSelector].toLowerCase();
            facetCuts.push({
                facetAddress: newFacetAddress,
                functionSelectors: newSelector,
                action: FacetCutAction.Add,
            });
            printItems.push({
                name: newSelectorsFacetNames[newSelector],
                address: newFacetAddress,
                selector: newSelector,
                method: getFunctionNameBySelector(facetFactories, newSelector),
                action: getFacetActionName(FacetCutAction.Add),
            });
        }
    }
    console.table(printItems);

    if (facetCuts.length === 0) {
        console.log('All facets methods already updated');
        return [];
    } else {
        return convertToCut(facetCuts);
    }
}

async function updateAbi(name, contract, facetsNames) {
    let diamondFacets = ['DiamondCutFacet', 'DiamondLoupeFacet'];
    let facetFactories = await getFacetFactories(facetsNames);
    facetFactories.push(...(await getFacetFactories(diamondFacets)));

    let abi = await mergeABIFacets(facetFactories);
    await deployments.delete(name);
    delete contract['abi'];
    await deployments.save(name, {
        address: contract.address,
        abi: abi,
        ...contract,
    });
    console.log(`${name}:${contract.address} updated ABI`);
}

function convertToCut(facetCuts) {
    for (let facetCut of facetCuts) {
        facetCut.functionSelectors = [facetCut.functionSelectors];
    }
    return facetCuts;
}

function getFacetNameBySelector(contracts, selector) {
    for (const contract of contracts) {
        for (const [key, value] of Object.entries(contract.interface.functions)) {
            let sighash = contract.interface.getSighash(value.name);
            if (sighash === selector) {
                return contract.name;
            }
        }
    }
    return '-';
}

function getFunctionNameBySelector(facetFactories, selector) {
    for (const facetFactory of facetFactories) {
        for (const [key, value] of Object.entries(facetFactory.interface.functions)) {
            let sighash = facetFactory.interface.getSighash(value.name);
            if (sighash === selector) {
                return value.name;
            }
        }
    }
    return '-';
}

async function getCurrentFacets(address) {
    let contract = await ethers.getContractAt(require('./abi/DIAMOND_LOUPLE.json'), address);
    return await contract.facets();
}

//TODO find a way to not redeploy facets
async function deployFacets(facetNames, deployer) {
    const facets = [];
    for (let facetName of facetNames) {
        let oldContract;
        try {
            oldContract = await ethers.getContract(facetName);
        } catch (e) { }
        let newFacetContract = await deployments.deploy(facetName, {
            from: deployer,
            args: [],
            log: true,
            skipIfAlreadyDeployed: false,
        });

        if (
            oldContract !== undefined &&
            (newFacetContract === undefined || (oldContract.address.toLowerCase() === newFacetContract.address.toLowerCase()))
        ) {
            console.log(`${facetName} no update required`);
        } else {
            console.log(`${facetName} deployed at ${newFacetContract.address}`);
        }
        facets.push(await ethers.getContractFactory(facetName));
    }
    return facets;
}

async function getFacetFactories(facetNames) {
    const facets = [];
    for (let facetName of facetNames) {
        try {
            let facet;
            try {
                facet = await ethers.getContractFactory(facetName);
            } catch (e) {
                facet = await getContract(facetName);
            }
            facet.name = facetName;
            facets.push(facet);
            console.log(`Success load factory: ${facetName}`);
        } catch (e) {
            console.log(`Cannot get factory: ${facetName} -> e: ${e}`);
        }
    }
    return facets;
}

async function getFacets(facetNames) {
    const facets = [];
    for (let facetName of facetNames) {
        let facet;
        if (hre.network.name === 'localhost') {
            facet = await getContract(facetName);
        } else {
            try {
                facet = await ethers.getContract(facetName);
            } catch (e) {
                facet = await getContract(facetName);
            }
        }
        const newFacet = {
            facetAddress: facet.address,
            functionSelectors: getSelectors(facet),
            facetName: facetName,
        };
        facets.push(newFacet);
    }
    return facets;
}

function getFacetActionName(action) {
    switch (action) {
        case 0:
            return 'Add';
        case 1:
            return 'Replace';
        case 2:
            return 'Remove';
        default:
            throw new Error('Unknown mapping action: ' + action);
    }
}

async function updateFacets(cut, address, deployer) {
    console.log(`${address}.diamondCut ...`);
    let strategy = await ethers.getContractAt('IDiamondCut', address);
    await (await strategy.diamondCut(cut, ethers.constants.AddressZero, '0x')).wait();
    console.log(`${address}.diamondCut done()`);
}

const FacetCutAction = { Add: 0, Replace: 1, Remove: 2 }

// get function selectors from ABI
function getSelectors (contract) {
    const signatures = Object.keys(contract.interface.functions)
    const selectors = signatures.reduce((acc, val) => {
        if (val !== 'init(bytes)') {
            acc.push(contract.interface.getSighash(val))
        }
        return acc
    }, [])
    selectors.contract = contract
    selectors.remove = remove
    selectors.get = get
    return selectors
}

// get function selector from function signature
function getSelector (func) {
    const abiInterface = new ethers.utils.Interface([func])
    return abiInterface.getSighash(ethers.utils.Fragment.from(func))
}

// used with getSelectors to remove selectors from an array of selectors
// functionNames argument is an array of function signatures
function remove (functionNames) {
    const selectors = this.filter((v) => {
        for (const functionName of functionNames) {
            if (v === this.contract.interface.getSighash(functionName)) {
                return false
            }
        }
        return true
    })
    selectors.contract = this.contract
    selectors.remove = this.remove
    selectors.get = this.get
    return selectors
}

// used with getSelectors to get selectors from an array of selectors
// functionNames argument is an array of function signatures
function get (functionNames) {
    const selectors = this.filter((v) => {
        for (const functionName of functionNames) {
            if (v === this.contract.interface.getSighash(functionName)) {
                return true
            }
        }
        return false
    })
    selectors.contract = this.contract
    selectors.remove = this.remove
    selectors.get = this.get
    return selectors
}

// remove selectors using an array of signatures
function removeSelectors (selectors, signatures) {
    const iface = new ethers.utils.Interface(signatures.map(v => 'function ' + v))
    const removeSelectors = signatures.map(v => iface.getSighash(v))
    selectors = selectors.filter(v => !removeSelectors.includes(v))
    return selectors
}

// find a particular address position in the return value of diamondLoupeFacet.facets()
function findAddressPositionInFacets (facetAddress, facets) {
    for (let i = 0; i < facets.length; i++) {
        if (facets[i].facetAddress === facetAddress) {
            return i
        }
    }
}

module.exports = {
    mergeABIFacets: mergeABIFacets,
    getRoleManagerAddress: getRoleManagerAddress,
    updateAbi: updateAbi,
    deployDiamond: deployDiamond,
    prepareCut: prepareCut,
    updateFacets: updateFacets,
    getFacetNameBySelector: getFacetNameBySelector,
    getFacets: getFacets,
    deployFacets: deployFacets,
    getSelectors: getSelectors,
    getSelector: getSelector,
    FacetCutAction: FacetCutAction,
    remove: remove,
    removeSelectors: removeSelectors,
    findAddressPositionInFacets: findAddressPositionInFacets
};
