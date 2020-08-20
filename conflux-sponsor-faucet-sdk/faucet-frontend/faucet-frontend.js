const {Conflux} = require('js-conflux-sdk');
const BigNumber = require('bignumber.js');
const faucetABI = require('./build/contracts/SponsorFaucet.json');

class Faucet {
    /**
     * @dev constructor for faucet
     * @param url The conflux provider url 
     * @param address The faucet contract address
     */
    constructor(url, address) {
        this.cfx = new Conflux({url: url});
        this.proxy = this.cfx.Contract({
            abi: faucetABI.abi,
            address: address,
        });
    }

    /**
     * @dev apply to be sponsored
     * @param dapp The address of dapp 
     * @param address The sender address of apply message
     */
    async apply(dapp, address) {
        let nonce = Number(await this.cfx.getNextNonce(address));
        let estimateData = await this.proxy.applyFor(dapp).estimateGasAndCollateral();
        let gas = new BigNumber(estimateData.gasUsed)
            .multipliedBy(1.3)
            .integerValue()
            .toString();
        let data = this.proxy.applyFor(dapp).data;
        let tx = {
            from: address,
            to: this.proxy.address,
            gas: gas,
            gasPrice: 1,
            nonce: nonce,
            data : data,
            value: 0,
        }
        return tx;
    }

    /*** TBA ***/
    async getGasBalance(dapp) {
        let val = Number(await this.proxy.getGasBalance(dapp).call());
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