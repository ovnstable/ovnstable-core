# OVNGT MVP

MVP of OVNGT interest bearing stablecoin

### Build Project

1. Install root packages via npm

`npm install`

2. Install NPX

`npm install npx`

4. Open folder vapp

`cd vapp`

3. Install packages via npm

`npm install`

### Run project

1. Starting hardhat node (local dev):

`
npx hardhat node
`

2 . Run tests

`
npx hardhat test
`

3. Run web

Open folder vapp and run command:

`npm run serve`

4. Connect to your MetaMask wallet

### How to set up MetaMask

1. Install MetaMask

https://metamask.io/

2. Set custom RPC

- Name network: Localhost 8545 
- URL: http://localhost:8545
- Chain ID: 31337
- Symbol: MATIC


### Prettier

To prettify solidity code install prettier plugin to VSCode:

```
code --install-extension esbenp.prettier-vscode
```

(https://github.com/prettier-solidity/prettier-plugin-solidity#vscode)

Params in `.prettierrc`

### Build && Deploy DAPP

Go to directory `vapp`

Run script and pass arguments:

- $token - auth token
- $url - ssh server name

`deploy.sh $token $url`

1) This script build docker image with frontend content
2) Push image to Yandex Cloud
3) Connect to server via ssh
4) Run command for polling docker image from Yandex Cloud
5) After polling it rum restart dapp


### How to deploy to Polygon Mainnet? 

1) Compile new version of Solidity contract: 
`truffle compile `
2) Deploy contract to Polygon:

`truffle migration --network polygon `

> You also need have secrets.json file in project directory

3) After deploying, you need to save .json files Contracts:

`cp -r vapp/contacts contracts_prod/`

4) Update .json version Contract for Ovnstable-api service - deploy it
5) Build dapp and deploy 
