// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "../Vault.sol";
import "../interfaces/IConnector.sol";
import "./mstable/interfaces/IMasset.sol";
import "./mstable/interfaces/ISavingsContract.sol";
import "./mstable/interfaces/IBoostedVaultWithLockup.sol";

contract ConnectorMStable is IConnector, Ownable {

    Vault public vault;
    IMasset public mUsdToken;
    ISavingsContractV2 public imUsdToken;
    IBoostedVaultWithLockup public vimUsdToken;
    address public mtaToken;
    address public wMaticToken;

    constructor(
        address _vault,
        address _mUsdToken,
        address _imUsdToken,
        address _vimUsdToken,
        address _mtaToken,
        address _wMaticToken
    ) {
        require(_vault != address(0), "Zero address not allowed");
        require(_mUsdToken != address(0), "Zero address not allowed");
        require(_imUsdToken != address(0), "Zero address not allowed");
        require(_vimUsdToken != address(0), "Zero address not allowed");
        require(_mtaToken != address(0), "Zero address not allowed");
        require(_wMaticToken != address(0), "Zero address not allowed");

        vault = Vault(_vault);
        mUsdToken = IMasset(_mUsdToken);
        imUsdToken = ISavingsContractV2(_imUsdToken);
        vimUsdToken = IBoostedVaultWithLockup(_vimUsdToken);
        mtaToken = _mtaToken;
        wMaticToken = _wMaticToken;
    }

    function stake(
        address _asset,
        uint256 _amount,
        address _beneficiar
    ) public override {
        IERC20(_asset).approve(address(mUsdToken), _amount);
        uint256 mintedTokens = mUsdToken.mint(_asset, _amount, 0, address(this));
        mUsdToken.approve(address(imUsdToken), mintedTokens);
        uint256 savedTokens = imUsdToken.depositSavings(mintedTokens, address(this));
        imUsdToken.approve(address(vimUsdToken), savedTokens);
        vimUsdToken.stake(_beneficiar, savedTokens);
    }

    function unstake(
        address _asset,
        uint256 _amount,
        address _beneficiar
    ) public override returns (uint256) {
        vault.unstakeMStable(address(imUsdToken), _amount, address(this));
        imUsdToken.redeem(imUsdToken.balanceOf(address(this)));
        mUsdToken.redeem(_asset, mUsdToken.balanceOf(address(this)), 0, address(this));
        uint256 redeemedTokens = IERC20(_asset).balanceOf(address(this));
        IERC20(_asset).transfer(_beneficiar, redeemedTokens);
        return redeemedTokens;
    }

}
