const express = require('express');
const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');

const ccpPath = path.resolve(__dirname, '../connection-org1.json');
const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

const app = express();
app.use(express.json());

app.post('/repair', async (req, res) => {
  try {
    const { identity, eqId, diagnosis, notes } = req.body;
    // load wallet and identity
    const wallet = await Wallets.newFileSystemWallet('./wallets/' + identity.org);
    const gateway = new Gateway();
    await gateway.connect(ccp, {
      wallet,
      identity: identity.name,
      discovery: { enabled: true, asLocalhost: false }
    });
    const network = await gateway.getNetwork('sharedchannel');
    const contract = network.getContract('equipmentcc');
    const result = await contract.submitTransaction('DiagnoseAndRepair', eqId, diagnosis, notes);
    await gateway.disconnect();
    res.json({ success: true, result: result.toString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log('Technician API listening on 3000'));
