const fs = require('fs');
const Conflux = require('js-conflux-sdk');
const Faucet = require('../src/faucet.js');
const BigNumber = require('bignumber.js');
const config = require('./config.js').config;
const address = JSON.parse(
    fs.readFileSync(__dirname + '/address.json')
);

const cfx = new Conflux.Conflux({url: config.cfx_oceanus});
const faucet = new Faucet.Faucet(config.cfx_oceanus, address.faucet_address, config.cfx_owner);
console.log(faucet);

async function test() {
    //applyFor
    await faucet.apply([address.dapp_address]);
    
    let account = cfx.Account(config.cfx_owner);
    let amount = await cfx.getBalance(address.faucet_address);
    console.log('amout: ', amount);
    console.log('new BigNumber: ', new BigNumber(amount));
    //pause and withdraw
    await faucet.pause();
    await faucet.withdraw(account.address, amount);
}

test();