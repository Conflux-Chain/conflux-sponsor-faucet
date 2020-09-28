const {Conflux} = require('js-conflux-sdk');
const BigNumber = require('bignumber.js');
//sponsor faucet contract abi
const faucet_contract = require('./build/contracts/SponsorFaucet.json');
//conflux built-in internal contract for Sponsorship
const cpc_contract = require('./build/contracts/SponsorWhitelistControl.json');

//suggested factor to make sure gas is enough
const suggested_withdraw_factor = 1.8;
const suggested_factor = 1.3;

class Faucet {
    /**
     * @dev constructor for faucet
     * @param url The conflux provider url 
     * @param address The faucet contract address
     */
    constructor(url, address) {
        this.cfx = new Conflux({url: url});
        this.faucet = this.cfx.Contract({
            abi: faucet_contract.abi,
            address: address,
        });
        this.cpc = this.cfx.Contract({
            abi: cpc_contract.abi,
            address: "0x0888000000000000000000000000000000000001",
        });
    }

    /**
     * @dev wrap and return { gas: suggestedGas, data: contractCall }  
     * @param call_func contract function
     * @param params params of contract function 
     */
    async tryWrapTx(call_func, params) {
        let estimateData = await call_func(...params).estimateGasAndCollateral();
        let gas;
        if (call_func === this.faucet.withdraw) {
            gas = new BigNumber(estimateData.gasUsed)
            .multipliedBy(suggested_withdraw_factor) //suggested value to make sure withdraw won't fail
            .integerValue()
            .toString();
        } else {
            gas = new BigNumber(estimateData.gasUsed)
            .multipliedBy(suggested_factor) //suggested value
            .integerValue()
            .toString();
        }
        let data = call_func(...params).data;
        let rawTx = {
            gas: gas,
            data: data,
        };
        return rawTx;
    }

    /**
     * @dev apply to be sponsored
     * @param dapp The address of dapp
     */
    async apply(dapp) {
        return await this.tryWrapTx(this.faucet.applyFor, [dapp]);
    }

    /**
     * @dev apply for gas
     * @param dapp The address of dapp
     */
    async applyForGas(dapp) {
        return await this.tryWrapTx(this.faucet.applyForGas, [dapp]);
    }

    /**
     * @dev apply for collateral
     * @param dapp The address of dapp 
     */
    async applyForCollateral(dapp) {
        return await this.tryWrapTx(this.faucet.applyForCollateral, [dapp]);
    }
    
    /**
     * @dev withdraw from faucet 
     * @param address address to accept fund
     * @param amount amount to withdraw
     */
    async withdraw(address, amount) {
        return await this.tryWrapTx(this.faucet.withdraw, [address, amount]);
    }

    /**
     * @dev pause faucet
     */
    async pause() {
        return await this.tryWrapTx(this.faucet.pause, []);
    }
}

module.exports = {
    Faucet: Faucet,
};