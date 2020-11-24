pragma solidity 0.5.11;

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

    // special quota 
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

    /*** bounds set by foundation ***/
    //small quota
    //total sponsored limit
    uint256 public gas_total_limit;
    uint256 public collateral_total_limit;
    //single sponsor bound
    uint256 public gas_bound;
    uint256 public collateral_bound;
    //upper bound for single tx
    uint256 public upper_bound;

    // general quota
    //total sponsored limit
    uint256 public general_gas_total_limit;
    uint256 public general_collateral_total_limit;
    //single sponsor bound
    uint256 public general_gas_bound;
    uint256 public general_collateral_bound;
    //upper bound for single tx
    uint256 public general_upper_bound;

    // for all contracts
    mapping(address => detail) public dapps;
    
    // bounds for special contracts
    mapping(address => bounds) public special_dapps;

    address[] public general_contracts;
    address[] public special_contracts;

    event applied(
        address indexed applicant,
        address indexed dapp,
        uint256 amount
    );

    SponsorWhitelistControl internal_sponsor = SponsorWhitelistControl(
        0x0888000000000000000000000000000000000001
    );

    constructor(
        uint256 gasTotalLimit,
        uint256 collateralTotalLimit,
        uint256 gasBound,
        uint256 collateralBound,
        uint256 upperBound,
        uint256 generalGasTotalLimit,
        uint256 generalCollateralTotalLimit,
        uint256 generalGasBound,
        uint256 generalCollateralBound,
        uint256 generalUpperBound
    ) public {
        //rule by internal contract
        require(upperBound.mul(1000) <= gasBound, "upperBound too high");
        gas_total_limit = gasTotalLimit;
        collateral_total_limit = collateralTotalLimit;
        gas_bound = gasBound;
        collateral_bound = collateralBound;
        upper_bound = upperBound;
        require(generalUpperBound.mul(1000) <= generalGasBound, "upperBound too high");
        general_gas_total_limit = generalGasTotalLimit;
        general_collateral_total_limit = generalCollateralTotalLimit;
        general_gas_bound = generalGasBound;
        general_collateral_bound = generalCollateralBound;
        general_upper_bound = generalUpperBound;
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
        whenPaused
    {
        require(address(this).balance >= amount, "amount too high");
        (bool success, ) = sponsor.call.value(amount)("");
        require(success, "withdraw failed");
    }

    //set bounds for sponsorship
    function setBounds(
        uint256 gasTotalLimit,
        uint256 collateralTotalLimit,
        uint256 gasBound,
        uint256 collateralBound,
        uint256 upperBound
    ) public {
        _onlyWhitelistAdmin();
        //rule by internal contract
        require(upperBound.mul(1000) <= gasBound, "upperBound too high");
        gas_total_limit = gasTotalLimit;
        collateral_total_limit = collateralTotalLimit;
        gas_bound = gasBound;
        collateral_bound = collateralBound;
        upper_bound = upperBound;
    }

    //set bounds for general contracts
    function setGeneralBounds(
        uint256 gasTotalLimit,
        uint256 collateralTotalLimit,
        uint256 gasBound,
        uint256 collateralBound,
        uint256 upperBound
    ) public {
        _onlyWhitelistAdmin();
        //rule by internal contract
        require(upperBound.mul(1000) <= gasBound, "upperBound too high");
        general_gas_total_limit = gasTotalLimit;
        general_collateral_total_limit = collateralTotalLimit;
        general_gas_bound = gasBound;
        general_collateral_bound = collateralBound;
        general_upper_bound = upperBound;
    }

    //set bounds for special contracts
    function setSpecialBounds(
        address addr,
        uint256 gasTotalLimit,
        uint256 collateralTotalLimit,
        uint256 gasBound,
        uint256 collateralBound,
        uint256 upperBound
    ) public {
        _onlyWhitelistAdmin();
        //rule by internal contract
        require(upperBound.mul(1000) <= gasBound, "upperBound too high");
        special_dapps[addr].gas_total_limit = gasTotalLimit;
        special_dapps[addr].collateral_total_limit = collateralTotalLimit;
        special_dapps[addr].gas_bound = gasBound;
        special_dapps[addr].collateral_bound = collateralBound;
        special_dapps[addr].upper_bound = upperBound;
    }


    /* ===== Public utility functions ===== */
    function addGeneralContracts(address[] memory addAddr) public {
        _onlyWhitelistAdmin();
        for(uint256 i = 0; i < addAddr.length; i++) {
            general_contracts.push(addAddr[i]);
        }
    }

    function addSpecialContracts(address[] memory addAddr) public {
        _onlyWhitelistAdmin();
        for(uint256 i = 0; i < addAddr.length; i++) {
            special_contracts.push(addAddr[i]);
        }
    }

    function specialContractsCount() public view returns (uint256) {
        return special_contracts.length;
    }

    function generalContractsCount() public view returns (uint256) {
        return general_contracts.length;
    }

    function isGeneralContract(address dapp) public view returns (bool) {
        for(uint256 i = 0; i < general_contracts.length; i++) {
            if(general_contracts[i] == dapp) return true;
        }
        return false;
    }

    function isSpecialContract(address dapp) public view returns (bool) {
        for(uint256 i = 0; i < special_contracts.length; i++) {
            if(special_contracts[i] == dapp) return true;
        }
        return false;
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
        uint256 contract_gas_bound;
        uint256 contract_gas_total_limit;
        if (isGeneralContract(dapp)) {
            contract_gas_bound = general_gas_bound;
            contract_gas_total_limit = general_gas_total_limit;
        } else if (isSpecialContract(dapp)) {
            contract_gas_bound = special_dapps[dapp].gas_bound;
            contract_gas_total_limit = special_dapps[dapp].gas_total_limit;
        } else {
            contract_gas_bound = gas_bound;
            contract_gas_total_limit = gas_total_limit;
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
        uint256 contract_gas_bound;
        uint256 contract_gas_total_limit;
        if (isGeneralContract(dapp)) {
            contract_gas_bound = general_gas_bound;
            contract_gas_total_limit = general_gas_total_limit;
        } else if (isSpecialContract(dapp)) {
            contract_gas_bound = special_dapps[dapp].gas_bound;
            contract_gas_total_limit = special_dapps[dapp].gas_total_limit;
        } else {
            contract_gas_bound = gas_bound;
            contract_gas_total_limit = gas_total_limit;
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
        uint256 contract_collateral_bound;
        uint256 contract_collateral_total_limit;
        if (isGeneralContract(dapp)) {
            contract_collateral_bound = general_collateral_bound;
            contract_collateral_total_limit = general_collateral_total_limit;
        } else if (isSpecialContract(dapp)) {
            contract_collateral_bound = special_dapps[dapp].collateral_bound;
            contract_collateral_total_limit = special_dapps[dapp].collateral_total_limit;
        } else {
            contract_collateral_bound = collateral_bound;
            contract_collateral_total_limit = collateral_total_limit;
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
        require(
            address(this).balance >= collateral_bound,
            "ERROR_COLLATERAL_FAUCET_OUT_OF_MONEY"
        );
        uint256 collateral_balance = internal_sponsor
            .getSponsoredBalanceForCollateral(dapp);
        uint256 contract_collateral_bound;
        uint256 contract_collateral_total_limit;
        
        if (isGeneralContract(dapp)) {
            contract_collateral_bound = general_collateral_bound;
            contract_collateral_total_limit = general_collateral_total_limit;
        } else if (isSpecialContract(dapp)) {
            contract_collateral_bound = special_dapps[dapp].collateral_bound;
            contract_collateral_total_limit = special_dapps[dapp].collateral_total_limit;
        } else {
            contract_collateral_bound = collateral_bound;
            contract_collateral_total_limit = collateral_total_limit;
        }
        
        require(collateral_balance < contract_collateral_bound, "ERROR_COLLATERAL_SPONSORED_FUND_UNUSED");
        require(
            dapps[dapp].collateral_amount_accumulated.add(contract_collateral_bound) <
                contract_collateral_total_limit,
            "ERROR_COLLATERAL_OVER_COLLATERAL_TOTAL_LIMIT"
        );
    }

    function _applyForGas(address dapp) internal {
        uint256 contract_gas_bound;
        uint256 contract_upper_bound;
        if (isGeneralContract(dapp)) {
            contract_gas_bound = general_gas_bound;
            contract_upper_bound = general_upper_bound;
        } else if (isSpecialContract(dapp)) {
            contract_gas_bound = special_dapps[dapp].gas_bound;
            contract_upper_bound = special_dapps[dapp].upper_bound;
        } else {
            contract_gas_bound = gas_bound;
            contract_upper_bound = upper_bound;
        }
        internal_sponsor.setSponsorForGas.value(contract_gas_bound)(dapp, contract_upper_bound);
        dapps[dapp].gas_amount_accumulated = dapps[dapp]
            .gas_amount_accumulated
            .add(contract_gas_bound);
        emit applied(msg.sender, dapp, contract_gas_bound);
    }

    function _applyForCollateral(address dapp) internal {
        uint256 contract_collateral_bound;
        if (isGeneralContract(dapp)) {
            contract_collateral_bound = general_collateral_bound;
        } else if (isSpecialContract(dapp)) {
            contract_collateral_bound = special_dapps[dapp].collateral_bound;
        } else {
            contract_collateral_bound = collateral_bound;
        }
        internal_sponsor.setSponsorForCollateral.value(contract_collateral_bound)(dapp);
        dapps[dapp].collateral_amount_accumulated = dapps[dapp]
            .collateral_amount_accumulated
            .add(contract_collateral_bound);
        emit applied(msg.sender, dapp, contract_collateral_bound);
    }
}
