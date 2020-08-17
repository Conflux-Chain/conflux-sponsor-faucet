const {Conflux} = require('js-conflux-sdk');
const BigNumber = require('bignumber.js');
const fs = require('fs');
const faucet = JSON.parse(
    fs.readFileSync(__dirname + '/../build/contracts/SponsorFaucet.json'),
);

class Faucet {
    constructor(url, address) {
        this.cfx = new Conflux({url: url});
        this.proxy = this.cfx.Contract({
            abi: faucet.abi,
            address: address,
        });
    }

    async apply(dapp, address, gasPrice) {
        let nonce = Number(await this.cfx.getNextNonce(address));
        let estimateData = this.proxy.applyFor(dapp).estimateGasAndCollateral();
        let gas = new BigNumber(estimateData.gasUsed)
            .multipliedBy(1.3)
            .integerValue()
            .toString();
        let data = this.proxy.applyFor(dapp).data;
        let tx = {
            from: address,
            to: this.proxy.address,
            gas: gas,
            gasPrice: gasPrice,
            nonce: nonce,
            data : data,
        }
        return tx;
    }

    async getGasBalance(dapp) {
        let val = Number(await this.proxy.getDappGas(dapp).call());
        return val;
    }

    async getCollateralBalance(dapp) {
        let val = Number(await this.proxy.getCollateralBalance(dapp).call());
        return val; 
    }
}

module.exports = {
    Faucet: Faucet,
};