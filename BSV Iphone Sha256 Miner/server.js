// server.js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const bsv = require('bsv');
const cors = require('cors');

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

const privateKeyWIF = process.env.BSV_PRIVATE_KEY;
const privateKey = bsv.PrivateKey.fromWIF(privateKeyWIF);
const address = privateKey.toAddress().toString();

app.post('/send', async (req, res) => {
  try {
    const { toAddress, amountSatoshis } = req.body;
    if (!toAddress || !amountSatoshis) return res.status(400).json({ error: 'Invalid input' });

    const utxosRes = await axios.get(`https://api.whatsonchain.com/v1/bsv/main/address/${address}/unspent`);
    const utxos = utxosRes.data;

    const tx = new bsv.Transaction()
      .from(utxos)
      .to(toAddress, amountSatoshis)
      .change(address)
      .sign(privateKey);

    const broadcastRes = await axios.post('https://api.whatsonchain.com/v1/bsv/main/tx/raw', {
      txhex: tx.toString()
    });

    res.json({ success: true, txid: broadcastRes.data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Transaction failed' });
  }
});

app.listen(port, () => {
  console.log(`BSV miner backend running at http://localhost:${port}`);
});
