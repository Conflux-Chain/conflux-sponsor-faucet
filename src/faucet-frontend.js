const {Conflux} = require('js-conflux-sdk');
const BigNumber = require('bignumber.js');
const fs = require('fs');
const faucet = JSON.parse(
    fs.readFileSync(__dirname + '/../build/contracts/SponsorFaucet.json'),
);
const price = 111;

class Faucet {
    constructor(url, address) {
        this.cfx = new Conflux({url: url});
        this.proxy = cfx.Contract({
            abi: faucet.abi,
            address: address,
        });
    }

    async function apply(dapp, address) {
        let nonce = Number(await this.cfx.getNextNonce(address));
        let estimateData = this.proxy.applyFor(dapp).estimateGasAndCollateral();
        let gas = new BigNumber(estimateData.gasUsed)
            .multipliedBy(1.5)
            .integerValue()
            .toString();
        let data = this.proxy.applyFor(dapp).data;
        let tx = {
            from: address,
            to: this.proxy.address,
            gas: gas,
            gasPrice: price,
            nonce: nonce,
            data : data,
        }
        return tx;
    }

    async function getGasBalance(dapp) {
        let val = Number(await this.proxy.getDappGas(dapp).call());
        return val;
    }

    async function getCollateralBalance(dapp) {
        let val = Number(await this.proxy.getCollateralBalance(dapp).call());
        return val; 
    }
}

module.exports = {
    Faucet: Faucet,
};