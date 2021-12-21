pragma solidity >=0.7.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IConnector.sol";
import "./balancer/interfaces/IVault.sol";
import "hardhat/console.sol";
import "./balancer/interfaces/IAsset.sol";
import "./balancer/MerkleOrchard.sol";

contract ConnectorBalancer is IConnector, Ownable {

    bytes32 public constant poolId = bytes32(uint256(0x0d34e5dd4d8f043557145598e4e2dc286b35fd4f000000000000000000000068));
    IAsset public constant usdc = IAsset(address(0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174));
    IAsset public constant tusd = IAsset(address(0x2e1AD108fF1D8C782fcBbB89AAd783aC49586756));
    IAsset public constant dai = IAsset(address(0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063));
    IAsset public constant usdt = IAsset(address(0xc2132D05D31c914a87C6611C10748AEb04B58e8F));
    address public constant bpspTUsd = address(0x0d34e5dD4D8f043557145598E4e2dC286B35FD4f);

    IVault public balancerVault;
    MerkleOrchard public merkleOrchard;

    function setBalancerVault(address _balancerVault) public onlyOwner {
        require(_balancerVault != address(0), "Zero address not allowed");
        balancerVault = IVault(_balancerVault);
    }

    function setMerkleOrchard(address _merkleOrchard) public onlyOwner {
        require(_merkleOrchard != address(0), "Zero address not allowed");
        merkleOrchard = MerkleOrchard(_merkleOrchard);
    }

//    function getMerkleOrchard() public onlyOwner returns (address) {
//        return address(merkleOrchard);
//    }

    function stake(
        address _asset,
        uint256 _amount,
        address _beneficiar
    ) public override {
        uint256 assetBalance = IERC20(_asset).balanceOf(address(this));
        console.log("assetBalance: %s", assetBalance);
        IERC20(_asset).approve(address(balancerVault), _amount);
        IAsset[] memory assets = new IAsset[](4);
        assets[0] = usdc;
        assets[1] = tusd;
        assets[2] = dai;
        assets[3] = usdt;
        uint256[] memory maxAmountsIn = new uint256[](4);
        maxAmountsIn[0] = _amount;
        maxAmountsIn[1] = 0;
        maxAmountsIn[2] = 0;
        maxAmountsIn[3] = 0;
        uint256 joinKindInit = 1;
        uint256[] memory initBalances = new uint256[](4);
        initBalances[0] = _amount;
        initBalances[1] = 0;
        initBalances[2] = 0;
        initBalances[3] = 0;
        bytes memory userData = abi.encode(joinKindInit, initBalances);
        IVault.JoinPoolRequest memory request = IVault.JoinPoolRequest(assets, maxAmountsIn, userData, false);
        console.log("Asset: %s", _asset);
        console.log("Amount: %s", _amount);
        console.log("Beneficiar: %s", _beneficiar);
        balancerVault.joinPool(poolId, address(this), address(this), request);
        console.log("Finish joinPool");

        (IERC20[] memory tokens, uint256[] memory balances, uint256 lastChangeBlock) = balancerVault.getPoolTokens(poolId);
        for (uint8 i = 0; i < tokens.length; i++) {
            console.log("Token: %s", address(tokens[i]));
            console.log("Balance: %s", balances[i]);
        }
        uint256[] memory userBalances = balancerVault.getInternalBalance(address(this), tokens);
        for (uint8 i = 0; i < userBalances.length; i++) {
            console.log("Token: %s", address(tokens[i]));
            console.log("UserBalance: %s", userBalances[i]);
        }
        assetBalance = IERC20(bpspTUsd).balanceOf(address(this));
        console.log("assetBalance: %s", assetBalance);
    }

    function unstake(
        address _asset,
        uint256 _amount,
        address _beneficiar
    ) public override returns (uint256) {
        address payable wallet = payable(_beneficiar);
        uint256 assetBalance = IERC20(bpspTUsd).balanceOf(address(this));
        console.log("assetBalance: %s", assetBalance);
        IERC20(bpspTUsd).approve(address(balancerVault), _amount);
        IAsset[] memory assets = new IAsset[](4);
        assets[0] = usdc;
        assets[1] = tusd;
        assets[2] = dai;
        assets[3] = usdt;
        uint256[] memory minAmountsOut = new uint256[](4);
        minAmountsOut[0] = 0;
        minAmountsOut[1] = 0;
        minAmountsOut[2] = 0;
        minAmountsOut[3] = 0;
        uint256 joinKindInit = 0;
        uint256 exitTokenIndex = 0;
        bytes memory userData = abi.encode(joinKindInit, _amount, exitTokenIndex);
        IVault.ExitPoolRequest memory request = IVault.ExitPoolRequest(assets, minAmountsOut, userData, false);
        console.log("Asset: %s", bpspTUsd);
        console.log("Amount: %s", _amount);
        console.log("Beneficiar: %s", _beneficiar);
        balancerVault.exitPool(poolId, address(this), wallet, request);
        console.log("Finish exitPool");

        (IERC20[] memory tokens, uint256[] memory balances, uint256 lastChangeBlock) = balancerVault.getPoolTokens(poolId);
        for (uint8 i = 0; i < tokens.length; i++) {
            console.log("Token: %s", address(tokens[i]));
            console.log("Balance: %s", balances[i]);
        }
        uint256[] memory userBalances = balancerVault.getInternalBalance(address(this), tokens);
        for (uint8 i = 0; i < userBalances.length; i++) {
            console.log("Token: %s", address(tokens[i]));
            console.log("UserBalance: %s", userBalances[i]);
        }
        assetBalance = IERC20(_asset).balanceOf(wallet);
        console.log("assetBalance: %s", assetBalance);
        return 0;
    }

    function claim(
        MerkleOrchard.Claim[] memory claims,
        IERC20[] memory tokens
    ) public returns (uint256) {
//        MerkleOrchard.Claim[] memory claims = new MerkleOrchard.Claim[](3);
//        for (uint256 i = 0; i < tokens.length; i++) {
//            uint256 distributionId = merkleOrchard.getNextDistributionId(tokens[i], address(this));
//            uint256 balance = merkleOrchard.getRemainingBalance()(tokens[i], address(this));
//            MerkleOrchard.Claim claim = MerkleOrchard.Claim(distributionId, balance, address(this), i, bytes32[] merkleProof);
//            claims[i] = claim;
//        }
        merkleOrchard.claimDistributions(address(this), claims, tokens);
        return 0;
    }

}
