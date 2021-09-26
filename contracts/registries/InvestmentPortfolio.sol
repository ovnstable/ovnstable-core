// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract InvestmentPortfolio is AccessControl {
    uint256 public constant TOTAL_WEIGHT = 100000; // 100000 ~ 100%

    mapping(address => uint256) private assetPositions;
    IERC20[] assets;
    mapping(address => uint256) private assetWeightPositions;
    AssetWeight[] public assetWeights;

    //TODO: remove
    event ConsoleLog(string str);

    struct AssetWeight {
        address asset;
        uint256 minWeight;
        uint256 targetWeight;
        uint256 maxWeight;
    }

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Restricted to admins");
        _;
    }

    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function addAsset(address asset) external onlyAdmin {
        require(asset != address(0), "Zero address not allowed");
        assets.push(IERC20(asset));
        assetPositions[address(asset)] = assets.length - 1;
    }

    function setWeights2(AssetWeight[] memory _assetWeights) external onlyAdmin {
        uint256 totalTarget = 0;
        for (uint8 i = 0; i < _assetWeights.length; i++) {
            require(_assetWeights[i].asset != address(0), "weight without asset");
            totalTarget += _assetWeights[i].targetWeight;
        }
        require(totalTarget == TOTAL_WEIGHT, "Total target should equal to TOTAL_WEIGHT");

        for (uint8 i = 0; i < _assetWeights.length; i++) {
            assetWeights[i] = _assetWeights[i];
            assetWeightPositions[assetWeights[i].asset] = i;
        }
    }

    function addActionBuilderAt(AssetWeight memory assetWeight, uint256 index) internal {
        uint256 currentlength = assetWeights.length;
        if (currentlength == 0 || currentlength - 1 < index) {
            uint256 additionalCount = index - currentlength + 1;
            for (uint8 i = 0; i < additionalCount; i++) {
                assetWeights.push();
            }
        }
        assetWeights[index] = assetWeight;
    }

    function setWeights(AssetWeight[] memory _assetWeights) public {
        //TODO: remove
        emit ConsoleLog(
            string(abi.encodePacked("_assetWeights.length: ", uint2str(_assetWeights.length)))
        );

        uint256 totalTarget = 0;
        for (uint8 i = 0; i < _assetWeights.length; i++) {
            AssetWeight memory assetWeight = _assetWeights[i];
            require(assetWeight.asset != address(0), "weight without asset");
            require(
                assetWeight.minWeight <= assetWeight.targetWeight,
                "minWeight shouldn't higher than targetWeight"
            );
            require(
                assetWeight.targetWeight <= assetWeight.maxWeight,
                "targetWeight shouldn't higher than maxWeight"
            );
            totalTarget += assetWeight.targetWeight;
        }
        require(totalTarget == TOTAL_WEIGHT, "Total target should equal to TOTAL_WEIGHT");
        //TODO: remove
        emit ConsoleLog(string(abi.encodePacked("totalTarget: ", uint2str(totalTarget))));

        for (uint8 i = 0; i < _assetWeights.length; i++) {
            addActionBuilderAt(_assetWeights[i], i);
            // assetWeights[i] = _assetWeights[i];
            assetWeightPositions[assetWeights[i].asset] = i;
        }

        // for (uint8 i = 0; i < _assetWeights.length; i++) {
        //     addActionBuilderAt(_assetWeights[i], i);
        //     // actionBuildersInOrder[i] = _actionBuildersInOrder[i];
        // }
        if (assetWeights.length > _assetWeights.length) {
            uint256 removeCount = assetWeights.length - _assetWeights.length;
            for (uint8 i = 0; i < removeCount; i++) {
                assetWeights.pop();
            }
        }
    }

    function getAllAssets() external view returns (IERC20[] memory) {
        return assets;
    }

    function getAssetWeight(address asset) external view returns (AssetWeight memory) {
        return assetWeights[assetWeightPositions[asset]];
    }

    function getAllAssetWeights() external returns (AssetWeight[] memory) {
        //TODO: remove
        emit ConsoleLog(
            string(abi.encodePacked("assetWeights.length: ", uint2str(assetWeights.length)))
        );

        return assetWeights;
    }

    //TODO: remove
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
            k = k - 1;
            bstr[k] = bytes1(uint8(48 + (_i % 10)));
            _i /= 10;
        }
        return string(bstr);
    }
}
