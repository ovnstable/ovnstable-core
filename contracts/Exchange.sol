// SPDX-License-Identifier: MIT
pragma solidity >=0.8 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IERC20MintableBurnable.sol";
import "./interfaces/IActivesList.sol";
import "./interfaces/IConnector.sol";
import "./OvernightToken.sol";
import "./interfaces/IPortfolioManager.sol";
import "./PortfolioManager.sol";
import "./interfaces/IMark2Market.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./interfaces/IActivesList.sol";

contract Exchange is AccessControl {
    OvernightToken ovn;
    IERC20 usdc;
    IActivesList actList;
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
        ovn = OvernightToken(_ovn);
        usdc = IERC20(_usdc);
    }

    function setAddr(address _addrAL, address _addrPM, address _addrM2M) external onlyAdmin {
        actList = IActivesList(_addrAL);
        PM = PortfolioManager(_addrPM);
        m2m = IMark2Market(_addrM2M);
    }

    function invest(address _addrTok, uint256 _amount) public {
        emit EventExchange("buy", _amount);


        uint256 balance = IERC20(_addrTok).balanceOf(msg.sender);
        require(balance >= _amount, "Not enough tokens to buy");

        IERC20(_addrTok).transferFrom(msg.sender, address(this), _amount);
        ovn.mint(msg.sender, _amount);

        IERC20(_addrTok).transfer(address(PM), _amount);
        PM.invest( IERC20(_addrTok), _amount);

    }

    function buy(address _addrTok, uint256 _amount) public {
        emit EventExchange("buy", _amount);


        uint256 balance = IERC20(_addrTok).balanceOf(msg.sender);
        require(balance >= _amount, "Not enough tokens to buy");

        IERC20(_addrTok).transferFrom(msg.sender, address(this), _amount);
        ovn.mint(msg.sender, _amount);
        actList.changeBal(_addrTok, int128(uint128(_amount)));
        IERC20(_addrTok).transfer(address(PM), _amount);
        PM.stake(_addrTok, _amount);

    }

    function balance() public view returns (uint256) {
        return ovn.balanceOf(msg.sender);
    }

    function redeem(address _addrTok, uint256 _amount) public {
        emit EventExchange("redeem", _amount);

        //TODO: Real unstacke amount may be different to _amount
        uint256 unstakedAmount = PM.unstake(_addrTok, _amount);
        // Or just burn from sender
        ovn.burn(msg.sender, _amount);
        actList.changeBal(_addrTok, - int128(uint128(unstakedAmount)));
        // TODO: correct amount by rates or oracles
        // TODO: check threshhold limits to withdraw deposite
        IERC20(_addrTok).transfer(msg.sender, unstakedAmount);



    }

    function reward() public onlyAdmin {
        // 1. get current amount of OVN
        // 2. get current amount of USDC
        // 3. get current amount of USDC that we will get from AAVE by total amount of aUSDC
        // 4. get total sum of USDC we can get from any source
        // 5. calc difference between total count of OVN and USDC
        // 6. go through all OVN owners and mint to their addresses proportionally OVN

        uint totalOvnSupply = ovn.totalSupply();
        uint amountUsdcAtPM = usdc.balanceOf(address(PM));
        IActivesList.Active memory active = actList.getActive(address(usdc));
        uint amountUsdcAtPMByAave = IConnector(active.connector).getBookValue(
            actList.getActive(active.derivatives[0]).actAddress,
            address(PM),
            actList.getActive(active.derivatives[0]).poolPrice
        );

        uint totalUsdc = amountUsdcAtPM + amountUsdcAtPMByAave;
        require(totalUsdc > totalOvnSupply, string(abi.encodePacked("Not enough usdc for rewards ", uint2str(totalUsdc), " <= ", uint2str(totalOvnSupply))));
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
