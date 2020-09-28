const {Conflux} = require('js-conflux-sdk');
const BigNumber = require('bignumber.js');
const faucet_contract = require('./build/contracts/SponsorFaucet.json');
const cpc_contract = require('./build/contracts/SponsorWhitelistControl.json');

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

    async tryWrapTx(call_func, params) {
        let estimateData = await call_func(...params).estimateGasAndCollateral();
        let gas;
        if (call_func === this.faucet.withdraw) {
            gas = new BigNumber(estimateData.gasUsed)
            .multipliedBy(1.8)
            .integerValue()
            .toString();
        } else {
            gas = new BigNumber(estimateData.gasUsed)
            .multipliedBy(1.3)
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

    async apply(dapp) {
        return await this.tryWrapTx(this.faucet.applyFor, [dapp]);
    }

    async applyForGas(dapp) {
        return await this.tryWrapTx(this.faucet.applyForGas, [dapp]);
    }

    async applyForCollateral(dapp) {
        return await this.tryWrapTx(this.faucet.applyForCollateral, [dapp]);
    }
    
    async withdraw(address, amount) {
        return await this.tryWrapTx(this.faucet.withdraw, [address, amount]);
    }

    async pause() {
        return await this.tryWrapTx(this.faucet.pause, []);
    }

    /**
     * @dev query functions 
     */
    async getSponsorForGas(dapp) {
        return await this.tryWrapTx(this.cpc.getSponsorForGas, [dapp]);
    }

    async getSponsoredBalanceForGas(dapp) {
        return await this.tryWrapTx(this.cpc.getSponsoredBalanceForGas, [dapp]);
    }

    async getSponsoredGasFeeUpperBound(dapp) {
        return  await this.tryWrapTx(this.cpc.getSponsoredGasFeeUpperBound, [dapp]);
    }

    async getSponsorForCollateral(dapp) {
        return await this.tryWrapTx(this.cpc.getSponsorForCollateral, [dapp]);
    }

    async getSponsoredBalanceForCollateral(dapp) {
        return await this.tryWrapTx(this.cpc.getSponsoredBalanceForCollateral, [dapp]);
    }

    async isWhitelisted(dapp, user) {
        return await this.tryWrapTx(this.cpc.isWhitelisted, [dapp, user]);
    }

    async isAllWhitelisted(dapp) {
        return await this.tryWrapTx(this.cpc.isAllWhitelisted, [dapp]);
    }
}

module.exports = {
    Faucet: Faucet,
};