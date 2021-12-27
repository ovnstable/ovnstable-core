pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "../interfaces/IConnector.sol";
import "./mstable/SaveWrapper.sol";
import "./mstable/interfaces/IMasset.sol";
import "./mstable/interfaces/ISavingsContract.sol";
import "./mstable/interfaces/IBoostedVaultWithLockup.sol";

import "hardhat/console.sol";

contract ConnectorMStable is IConnector, Ownable {

    SaveWrapper public saveWrapper;
    IMasset public mUsdToken;
    ISavingsContractV2 public imUsdToken;
    IBoostedVaultWithLockup public vimUsdToken;

    constructor(
        address _saveWrapper,
        address _mUsdToken,
        address _imUsdToken,
        address _vimUsdToken
    ) {
        require(_saveWrapper != address(0), "Zero address not allowed");
        require(_mUsdToken != address(0), "Zero address not allowed");
        require(_imUsdToken != address(0), "Zero address not allowed");
        require(_vimUsdToken != address(0), "Zero address not allowed");

        saveWrapper = SaveWrapper(_saveWrapper);
        mUsdToken = IMasset(_mUsdToken);
        imUsdToken = ISavingsContractV2(_imUsdToken);
        vimUsdToken = IBoostedVaultWithLockup(_vimUsdToken);
    }

    function stake(
        address _asset,
        uint256 _amount,
        address _beneficiar
    ) public override {
        IERC20(_asset).approve(address(saveWrapper), _amount);
        saveWrapper.saveViaMint(address(mUsdToken), address(imUsdToken), address(vimUsdToken), _asset, _amount, 0, true);
//        IERC20(address (idleToken)).transfer(_beneficiar, mintedTokens);
    }

    function unstake(
        address _asset,
        uint256 _amount,
        address _beneficiar
    ) public override returns (uint256) {
        console.log("vimUsdToken balance before: %s", vimUsdToken.balanceOf(address(this)));
        vimUsdToken.withdraw(_amount);
        console.log("vimUsdToken balance after: %s", vimUsdToken.balanceOf(address(this)));
        console.log("imUsdToken balance before: %s", imUsdToken.balanceOf(address(this)));
        imUsdToken.redeem(imUsdToken.balanceOf(address(this)));
        console.log("imUsdToken balance after: %s", imUsdToken.balanceOf(address(this)));
        console.log("mUsdToken balance before: %s", mUsdToken.balanceOf(address(this)));
        mUsdToken.redeem(_asset, mUsdToken.balanceOf(address(this)), 0, address(this));
        console.log("mUsdToken balance after: %s", mUsdToken.balanceOf(address(this)));
//        IERC20(_asset).transfer(_beneficiar, redeemedTokens);
        return IERC20(_asset).balanceOf(address(this));
    }

}
