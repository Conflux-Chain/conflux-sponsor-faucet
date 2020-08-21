const Faucet = require('faucet-frontend');
const BigNumber = require('bignumber.js');
const Conflux = require('js-conflux-sdk');

const faucetAddress = '';
const cfxUrl = '';

const dappAddress = '';
const walletAddress = '';

const cfx = new Conflux.Conflux({url: cfxUrl});

const faucet = Faucet.Faucet(cfxUrl, faucetAddress);

async function main() {
    //apply, get transaction tx to be signed by conflux portal
    /**
     structure of tx
     {
        from: ,
        to: ,
        gas: ,
        gasPrice: ,
        nonce: ,
        data: ,
        value: 0, 
     }
    */
    let tx = await faucet.apply(dappAddress);

    //sign and send transaction
}

main();