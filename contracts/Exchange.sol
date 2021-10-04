// SPDX-License-Identifier: MIT
pragma solidity >=0.8 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./interfaces/IERC20MintableBurnable.sol";
import "./interfaces/IConnector.sol";
import "./OvernightToken.sol";
import "./interfaces/IPortfolioManager.sol";
import "./PortfolioManager.sol";
import "./Buffer.sol";
import "./interfaces/IMark2Market.sol";

contract Exchange is AccessControl {
    using Buffer for Buffer.buffer;

    OvernightToken ovn;
    IERC20 usdc;
    PortfolioManager PM; //portfolio manager contract
    IMark2Market m2m;

    event EventExchange(string label, uint256 amount);
    event BusinessEvent(string label, uint256 beforeAmount, uint256 afterAmount);
    event BusinessEventPrice(string label, IMark2Market.ActivesPrices prices);
    event RewardEvent(uint256 totalOvn, uint256 totalUsdc, uint256 totallyAmountRewarded, uint256 totallySaved);

    modifier onlyAdmin()
    {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Restricted to admins");
        _;
    }

    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function setTokens(address _ovn, address _usdc) external onlyAdmin{
        require(_ovn != address(0), "Zero address not allowed");
        require(_usdc != address(0), "Zero address not allowed");
        ovn = OvernightToken(_ovn);
        usdc = IERC20(_usdc);
    }

    function setAddr(address _addrPM, address _addrM2M) external onlyAdmin {
        require(_addrPM != address(0), "Zero address not allowed");
        require(_addrM2M != address(0), "Zero address not allowed");
        PM = PortfolioManager(_addrPM);
        m2m = IMark2Market(_addrM2M);
    }

    function balance() public view returns (uint256) {
        return ovn.balanceOf(msg.sender);
    }

    function buy(address _addrTok, uint256 _amount) external {
        emit EventExchange("buy", _amount);

        uint256 balance = IERC20(_addrTok).balanceOf(msg.sender);
        require(balance >= _amount, "Not enough tokens to buy");

        IERC20(_addrTok).transferFrom(msg.sender, address(this), _amount);
        ovn.mint(msg.sender, _amount);

        IERC20(_addrTok).transfer(address(PM), _amount);
        PM.invest( IERC20(_addrTok), _amount);
    }

    event ErrorLogging(string reason);

    function redeem(address _addrTok, uint256 _amount) external {
        emit EventExchange("redeem", _amount);

        //TODO: Real unstacke amount may be different to _amount

        // try PM.withdraw(IERC20(_addrTok), _amount) returns (uint256 unstakedAmount) {
            
        //     // Or just burn from sender
        //     ovn.burn(msg.sender, _amount);

        //     // TODO: correct amount by rates or oracles
        //     // TODO: check threshhold limits to withdraw deposite
        //     IERC20(_addrTok).transfer(msg.sender, unstakedAmount);

        // } catch Error(string memory reason) {
        //     // This may occur if there is an overflow with the two numbers and the `AddNumbers` contract explicitly fails with a `revert()`
        //     emit ErrorLogging(reason);
        // } catch {
        //     emit ErrorLogging("No reason");
        //     // revert (string(buf.buf));
        // }


        uint256 unstakedAmount = PM.withdraw(IERC20(_addrTok), _amount);

        // Or just burn from sender
        ovn.burn(msg.sender, _amount);

        // TODO: correct amount by rates or oracles
        // TODO: check threshhold limits to withdraw deposite
        IERC20(_addrTok).transfer(msg.sender, unstakedAmount);
    }


    function reward() external onlyAdmin {
        // 1. get current amount of OVN
        // 2. get total sum of USDC we can get from any source
        // 3. calc difference between total count of OVN and USDC
        // 4. go through all OVN owners and mint to their addresses proportionally OVN

        uint totalOvnSupply = ovn.totalSupply();
        IMark2Market.TotalAssetPrices memory assetPrices = m2m.assetPricesForBalance();
        uint256 totalUsdc = assetPrices.totalUsdcPrice;
        require(totalUsdc > totalOvnSupply, string(abi.encodePacked("Nothing to reward: ", uint2str(totalUsdc), " <= ", uint2str(totalOvnSupply))));
        uint difference  = totalUsdc - totalOvnSupply;

        uint totallyAmountRewarded = 0;
        for (uint8 i = 0; i < ovn.ownerLength(); i++) {
            address ovnOwnerAddress = ovn.ownerAt(i);
            uint ovnBalance = ovn.balanceOf(ovnOwnerAddress);
            uint additionalMintAmount = ovnBalance * difference / totalOvnSupply;
            if (additionalMintAmount > 0) {
                ovn.mint(ovnOwnerAddress, additionalMintAmount);
                totallyAmountRewarded += additionalMintAmount;
            }
        }
        //TODO: what to do with saved usdc? Do we need to mint it to PM

        emit RewardEvent(
            totalOvnSupply,
            totalUsdc,
            totallyAmountRewarded,
            difference - totallyAmountRewarded
        );

    }

    function uint2str(uint _i) internal pure returns (string memory _uintAsString) {
        if (_i == 0) {
            return "0";
        }
        uint j = _i;
        uint len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint k = len;
        while (_i != 0) {
            k=k-1;
            bstr[k] = bytes1(uint8(48 + _i % 10));
            _i /= 10;
        }
        return string(bstr);
    }
}
