pragma solidity 0.5.11;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts/lifecycle/Pausable.sol";
import "@openzeppelin/contracts/access/roles/WhitelistedRole.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "./Lib/ReentrancyGuard.sol";
import "./InternalContract.sol";

contract SponsorFaucet is Ownable, Pausable, ReentrancyGuard, WhitelistedRole {
    using SafeMath for uint256;
    using Address for address;

    struct detail {
        uint256 gas_amount_accumulated; //current accumulated sponsored amout for gas
        uint256 collateral_amount_accumulated; //current total sponsored amount for collateral
    }
 
    struct bounds {
        //total sponsored limit
        uint256 gas_total_limit;
        uint256 collateral_total_limit;
        //single sponsor bound
        uint256 gas_bound;
        uint256 collateral_bound;
        //upper bound for single tx
        uint256 upper_bound;
    }

    //constant address used as key for small and large
    address constant small = 0x0000000000000000000000000000000000000000;
    address constant large = 0x0000000000000000000000000000000000000001;

    // for all contracts
    mapping(address => detail) public dapps;
    
    // bounds for contracts
    mapping(address => bounds) public dapp_bounds;

    mapping(address => bool) public large_contracts;
    mapping(address => bool) public custom_contracts;

    event applied(
        address indexed applicant,
        address indexed dapp,
        uint256 amount
    );

    SponsorWhitelistControl internal_sponsor = SponsorWhitelistControl(
        0x0888000000000000000000000000000000000001
    );

    constructor(
        bounds memory smallBounds,
        bounds memory largeBounds
    ) public {
        //rule by internal contract
        require(smallBounds.upper_bound.mul(1000) <= smallBounds.gas_bound, "upperBound too high");
        require(largeBounds.upper_bound.mul(1000) <= largeBounds.gas_bound, "upperBound too high");
        dapp_bounds[small] = smallBounds;
        dapp_bounds[large] = largeBounds;
    }

    /*** Dapp dev calls ***/
    function applyGasAndCollateral(address dapp)
        public
        nonReentrant
        whenNotPaused
    {
        if (_isAppliableForGas(dapp)) _applyForGas(dapp);
        if (_isAppliableForCollateral(dapp)) _applyForCollateral(dapp);
    }

    function isAppliable(address dapp) public returns (bool) {
        if (_isAppliableForGas(dapp) || _isAppliableForCollateral(dapp))
            return true;
        require(dapp.isContract(), "ERROR_ADDRESS_IS_NOT_CONTRACT");
        _validateApplyForGas(dapp);
        _validateApplyForCollateral(dapp);
    }

    //accept sponsor's cfx
    function() external payable {}

    //withdraw to specific address by amount
    function withdraw(address payable sponsor, uint256 amount)
        public
        onlyOwner
        nonReentrant
    {
        require(address(this).balance >= amount, "amount too high");
        (bool success, ) = sponsor.call.value(amount)("");
        require(success, "withdraw failed");
    }

    //set bounds for sponsorship
    function setBounds(
        bounds memory smallBounds
    ) public {
        _onlyWhitelistAdmin();
        //rule by internal contract
        require(smallBounds.upper_bound.mul(1000) <= smallBounds.gas_bound, "upperBound too high");
        dapp_bounds[small] = smallBounds;
    }

    //set bounds for general contracts
    function setGeneralBounds(
        bounds memory largeBounds
    ) public {
        _onlyWhitelistAdmin();
        //rule by internal contract
        require(largeBounds.upper_bound.mul(1000) <= largeBounds.gas_bound, "upperBound too high");
        dapp_bounds[large] = largeBounds;
    }

    //set bounds for custom contracts
    function setCustomBounds(
        address addr,
        bounds memory customBounds
    ) public {
        _onlyWhitelistAdmin();
        //rule by internal contract
        require(customBounds.upper_bound.mul(1000) <= customBounds.gas_bound, "upperBound too high");
        dapp_bounds[addr] = customBounds;
    }


    /* ===== Public utility functions ===== */
    function addLargeContracts(address[] memory addAddr) public {
        _onlyWhitelistAdmin();
        for(uint256 i = 0; i < addAddr.length; i++) {
            large_contracts[addAddr[i]] = true;
            if(custom_contracts[addAddr[i]]) {
                delete dapp_bounds[addAddr[i]];
            }
            custom_contracts[addAddr[i]] = false;
        }
    }

    function addCustomContracts(address[] memory addAddr, bounds[] memory addrBounds) public {
        _onlyWhitelistAdmin();
        require(addAddr.length == addrBounds.length, "length not match");
        for(uint256 i = 0; i < addAddr.length; i++) {
            custom_contracts[addAddr[i]] = true;
            large_contracts[addAddr[i]] = false;
            dapp_bounds[addAddr[i]] = addrBounds[i];
        }
    }

    function removeLargeContract(address[] memory removeAddr) public {
        _onlyWhitelistAdmin();
        for(uint256 i = 0; i < removeAddr.length; i++) {
            delete large_contracts[removeAddr[i]];
            delete dapp_bounds[removeAddr[i]];
        }
    }

    function removeCustomContract(address[] memory removeAddr) public {
        _onlyWhitelistAdmin();
        for(uint256 i = 0; i < removeAddr.length; i++) {
            delete custom_contracts[removeAddr[i]];
            delete dapp_bounds[removeAddr[i]];
        }
    }

    function isLargeContract(address dapp) public view returns (bool) {
        return large_contracts[dapp];
    }

    function isCustomContract(address dapp) public view returns (bool) {
        return custom_contracts[dapp];
    }

    function _onlyWhitelistAdmin() internal view {
        require(
            isWhitelistAdmin(msg.sender),
            "caller does not have the WhitelistAdmin role"
        );
    }

    function _isAppliableForGas(address dapp) internal returns (bool) {
        if(!dapp.isContract()) return false;
        uint256 gas_balance = internal_sponsor.getSponsoredBalanceForGas(dapp);
        address current_sponsor = internal_sponsor.getSponsorForGas(dapp);
        uint256 contract_gas_bound = dapp_bounds[small].gas_bound;
        uint256 contract_gas_total_limit = dapp_bounds[small].gas_total_limit;
        if (isCustomContract(dapp)) {
            contract_gas_bound = dapp_bounds[dapp].gas_bound;
            contract_gas_total_limit = dapp_bounds[dapp].gas_total_limit;
        }
        if (isLargeContract(dapp)) {
            contract_gas_bound = dapp_bounds[large].gas_bound;
            contract_gas_total_limit = dapp_bounds[large].gas_total_limit;
        }
        
        if (
            current_sponsor == address(this) ||
            current_sponsor ==
            address(0x0000000000000000000000000000000000000000)
        ) {
            return
                address(this).balance >= contract_gas_bound &&
                gas_balance < contract_gas_bound &&
                dapps[dapp].gas_amount_accumulated.add(contract_gas_bound) <=
                contract_gas_total_limit;
        }

        uint256 current_upper_bound = internal_sponsor
            .getSponsoredGasFeeUpperBound(dapp);
        return
            gas_balance < current_upper_bound &&
            address(this).balance >= contract_gas_bound &&
            gas_balance < contract_gas_bound &&
            dapps[dapp].gas_amount_accumulated.add(contract_gas_bound) <=
            contract_gas_total_limit;
    }

    function _validateApplyForGas(address dapp) internal {
        address current_sponsor = internal_sponsor.getSponsorForGas(dapp);
        uint256 gas_balance = internal_sponsor.getSponsoredBalanceForGas(dapp);
        uint256 contract_gas_bound = dapp_bounds[small].gas_bound;
        uint256 contract_gas_total_limit = dapp_bounds[small].gas_total_limit;
        if (isCustomContract(dapp)) {
            contract_gas_bound = dapp_bounds[dapp].gas_bound;
            contract_gas_total_limit = dapp_bounds[dapp].gas_total_limit;
        }
        if (isLargeContract(dapp)) {
            contract_gas_bound = dapp_bounds[large].gas_bound;
            contract_gas_total_limit = dapp_bounds[large].gas_total_limit;
        }

        if (
            current_sponsor != address(this) &&
            current_sponsor !=
            address(0x0000000000000000000000000000000000000000)
        ) {
            require(
                gas_balance <
                    internal_sponsor.getSponsoredGasFeeUpperBound(dapp),
                "ERROR_GAS_CANNOT_REPLACE_THIRD_PARTY_SPONSOR"
            );
        }
        require(address(this).balance >= contract_gas_bound, "ERROR_GAS_FAUCET_OUT_OF_MONEY");
        require(gas_balance < contract_gas_bound, "ERROR_GAS_SPONSORED_FUND_UNUSED");
        require(
            dapps[dapp].gas_amount_accumulated.add(contract_gas_bound) <=
                contract_gas_total_limit,
            "ERROR_GAS_OVER_GAS_TOTAL_LIMIT"
        );
    }

    function _isAppliableForCollateral(address dapp) internal returns (bool) {
        if(!dapp.isContract()) return false;
        uint256 collateral_balance = internal_sponsor
            .getSponsoredBalanceForCollateral(dapp);
        uint256 contract_collateral_bound = dapp_bounds[small].collateral_bound;
        uint256 contract_collateral_total_limit = dapp_bounds[small].collateral_total_limit;       
        if (isCustomContract(dapp)) {
            contract_collateral_bound = dapp_bounds[dapp].collateral_bound;
            contract_collateral_total_limit = dapp_bounds[dapp].collateral_total_limit;
        }
        if (isLargeContract(dapp)) {
            contract_collateral_bound = dapp_bounds[large].collateral_bound;
            contract_collateral_total_limit = dapp_bounds[large].collateral_total_limit;
        }       
        if (
            address(this).balance >= contract_collateral_bound &&
            collateral_balance < contract_collateral_bound &&
            dapps[dapp].collateral_amount_accumulated.add(contract_collateral_bound) <=
            contract_collateral_total_limit
        ) {
            return true;
        }
    }

    function _validateApplyForCollateral(address dapp) internal {
        uint256 collateral_balance = internal_sponsor
            .getSponsoredBalanceForCollateral(dapp);
        uint256 contract_collateral_bound = dapp_bounds[small].collateral_bound;
        uint256 contract_collateral_total_limit = dapp_bounds[small].collateral_total_limit;
        if (isCustomContract(dapp)) {
            contract_collateral_bound = dapp_bounds[dapp].collateral_bound;
            contract_collateral_total_limit = dapp_bounds[dapp].collateral_total_limit;
        }
        if (isLargeContract(dapp)) {
            contract_collateral_bound = dapp_bounds[large].collateral_bound;
            contract_collateral_total_limit = dapp_bounds[large].collateral_total_limit;
        }    
        require(
            address(this).balance >= contract_collateral_bound,
            "ERROR_COLLATERAL_FAUCET_OUT_OF_MONEY"
        );
        require(collateral_balance < contract_collateral_bound, "ERROR_COLLATERAL_SPONSORED_FUND_UNUSED");
        require(
            dapps[dapp].collateral_amount_accumulated.add(contract_collateral_bound) <
                contract_collateral_total_limit,
            "ERROR_COLLATERAL_OVER_COLLATERAL_TOTAL_LIMIT"
        );
    }

    function _applyForGas(address dapp) internal {
        uint256 contract_gas_bound = dapp_bounds[small].gas_bound;
        uint256 contract_upper_bound = dapp_bounds[small].upper_bound;
        
        if (isLargeContract(dapp)) {
            contract_gas_bound = dapp_bounds[large].gas_bound;
            contract_upper_bound = dapp_bounds[large].upper_bound;
        } 
        if (isCustomContract(dapp)) {
            contract_gas_bound = dapp_bounds[dapp].gas_bound;
            contract_upper_bound = dapp_bounds[dapp].upper_bound;
        }

        internal_sponsor.setSponsorForGas.value(contract_gas_bound)(dapp, contract_upper_bound);
        dapps[dapp].gas_amount_accumulated = dapps[dapp]
            .gas_amount_accumulated
            .add(contract_gas_bound);
        emit applied(msg.sender, dapp, contract_gas_bound);
    }

    function _applyForCollateral(address dapp) internal {
        uint256 contract_collateral_bound = dapp_bounds[small].collateral_bound;
        if (isLargeContract(dapp)) {
            contract_collateral_bound = dapp_bounds[large].collateral_bound;
        } 
        if (isCustomContract(dapp)) {
            contract_collateral_bound = dapp_bounds[dapp].collateral_bound;
        }

        internal_sponsor.setSponsorForCollateral.value(contract_collateral_bound)(dapp);
        dapps[dapp].collateral_amount_accumulated = dapps[dapp]
            .collateral_amount_accumulated
            .add(contract_collateral_bound);
        emit applied(msg.sender, dapp, contract_collateral_bound);
    }
}
