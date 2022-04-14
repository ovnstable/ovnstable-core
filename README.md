# Overnight Contracts

This repository contains all contracts Overnight

##### Requirement:

- Node v16
- yarn v1.22.18

## How to install?

1. Install node 
2. Install yarn
3. Run `yarn install`
4. Create .env file from copy .env.example
5. Define PK_${CHAIN} if you need to deploy contracts to real chain

 
```
enum CHAIN:

- POLYGON
- FANTOM

```


## Modules:

This repository contains is next modules:

1) common - it contains common scripts for deploying, build, testing contracts
2) governance - governance contracts
3) core - core contracts 
4) strategies - contains sub modules with strategies for each chain


### Accounts for local development:

- Account: **deployer**: 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266
- Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

Private key need to import to Metamask


### Upgrade VS Code

To prettify solidity code install prettier plugin to VSCode:

```
code --install-extension esbenp.prettier-vscode
```

(https://github.com/prettier-solidity/prettier-plugin-solidity#vscode)

Params in `.prettierrc`

### Upgrade IDEA

Install plugin (https://plugins.jetbrains.com/plugin/9475-solidity)


