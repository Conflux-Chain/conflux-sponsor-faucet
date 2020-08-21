const fs = require('fs');
const Web3 = require('web3');
const w3 = new Web3();
const BigNumber = require('bignumber.js');

const config = {
  cfx_oceanus: 'http://18.182.200.167:12537',
  cfx_addr: 'http://testnet-jsonrpc.conflux-chain.org:12537',
  //cfx_oceanus: 'http://mainnet-jsonrpc.conflux-chain.org:12537',
  faucet_contract: JSON.parse(
    fs.readFileSync(__dirname + '/../build/contracts/SponsorFaucet.json'),
  ),
  dapp_contract: JSON.parse(
    fs.readFileSync(__dirname + '/../build/contracts/Dapp.json'),
  ),

  info:{
      gasBound: w3.utils.toHex(new BigNumber(100).multipliedBy(1e18)),
      storageBound: w3.utils.toHex(new BigNumber(1000).multipliedBy(1e18)),
      upperBound: w3.utils.toHex(new BigNumber(0.0001).multipliedBy(1e18)),
      value: w3.utils.toHex(new BigNumber(50000).multipliedBy(1e18)),
  },
  cfx_user: '',
  cfx_zero: '',
  cfx_owner: '',
};

module.exports = {
  config: config,
};
