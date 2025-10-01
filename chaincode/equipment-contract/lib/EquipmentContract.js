/* package.json must include: "fabric-contract-api" */
'use strict';

const { Contract } = require('fabric-contract-api');

class EquipmentContract extends Contract {

  // Init
  async instantiate(ctx) {
    console.info('Chaincode instanciado');
  }

  // Create equipment (donation)
  async DonateEquipment(ctx, eqId, donorId, metadataJSON) {
    const exists = await this.EquipmentExists(ctx, eqId);
    if (exists) {
      throw new Error(`Equipment ${eqId} já existe`);
    }
    // permission: only users with role=donor or role=admin can donate
    const role = ctx.clientIdentity.getAttributeValue('role');
    if (!role || (role !== 'donor' && role !== 'admin')) {
      throw new Error('Não autorizado: apenas donor ou admin');
    }
    const asset = {
      id: eqId,
      donorId,
      metadata: JSON.parse(metadataJSON),
      status: 'donated',
      ownerOrg: ctx.clientIdentity.getMSPID(),
      history: [{ ts: new Date().toISOString(), action: 'donated', by: ctx.clientIdentity.getID() }]
    };
    await ctx.stub.putState(eqId, Buffer.from(JSON.stringify(asset)));
    return JSON.stringify(asset);
  }

  // Mark accepted into inventory (by IPSS)
  async Intake(ctx, eqId, intakeNotes) {
    const asset = await this.ReadEquipment(ctx, eqId);
    const role = ctx.clientIdentity.getAttributeValue('role');
    if (!role || (role !== 'ipss' && role !== 'admin' && role !== 'technician')) {
      throw new Error('Não autorizado: apenas IPSS/technician/admin');
    }
    asset.status = 'intaked';
    asset.history.push({ ts: new Date().toISOString(), action: 'intake', notes: intakeNotes, by: ctx.clientIdentity.getID() });
    await ctx.stub.putState(eqId, Buffer.from(JSON.stringify(asset)));
    return JSON.stringify(asset);
  }

  // Technician performs diagnosis and repair
  async DiagnoseAndRepair(ctx, eqId, diagnosis, repairNotes) {
    const asset = await this.ReadEquipment(ctx, eqId);
    const role = ctx.clientIdentity.getAttributeValue('role');
    if (role !== 'technician' && role !== 'admin') {
      throw new Error('Não autorizado: apenas técnicos/admin');
    }
    asset.status = 'repaired';
    asset.history.push({ ts: new Date().toISOString(), action: 'repaired', diagnosis, repairNotes, by: ctx.clientIdentity.getID() });
    await ctx.stub.putState(eqId, Buffer.from(JSON.stringify(asset)));
    return JSON.stringify(asset);
  }

  // Assign to beneficiary (sensitive data -> use Private Data)
  async AssignToBeneficiary(ctx, eqId, beneficiaryId) {
    // This function writes the assignment; PII should be stored in private data collection
    const asset = await this.ReadEquipment(ctx, eqId);
    const role = ctx.clientIdentity.getAttributeValue('role');
    if (role !== 'ipss' && role !== 'admin') {
      throw new Error('Não autorizado');
    }
    asset.status = 'assigned';
    asset.beneficiaryId = beneficiaryId;
    asset.history.push({ ts: new Date().toISOString(), action: 'assigned', beneficiary: beneficiaryId, by: ctx.clientIdentity.getID() });
    await ctx.stub.putState(eqId, Buffer.from(JSON.stringify(asset)));
    return JSON.stringify(asset);
  }

  async ReadEquipment(ctx, eqId) {
    const data = await ctx.stub.getState(eqId);
    if (!data || data.length === 0) {
      throw new Error(`Equipment ${eqId} não encontrado`);
    }
    return JSON.parse(data.toString());
  }

  async EquipmentExists(ctx, eqId) {
    const data = await ctx.stub.getState(eqId);
    return data && data.length > 0;
  }

  async QueryEquipmentByStatus(ctx, status) {
    const query = { selector: { status } };
    const iterator = await ctx.stub.getQueryResult(JSON.stringify(query));
    const results = [];
    for await (const res of iterator) {
      results.push(JSON.parse(res.value.toString('utf8')));
    }
    return JSON.stringify(results);
  }
}

module.exports = EquipmentContract;
