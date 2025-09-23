'use strict';

const { Contract } = require('fabric-contract-api');
const createHash = require('sha.js');

class StudentKeepContract extends Contract {

    // Helper para criar hash SHA256 (usado para serials / studentIDs)
    _sha256(data) {
        return createHash('sha256').update(data).digest('hex');
    }

    // InitLedger - opcional: popular com exemplos
    async InitLedger(ctx) {
        const assets = [
            {
                assetId: 'asset0',
                serialHash: this._sha256('SERIAL-0000'),
                make: 'ExampleMake',
                model: 'ExModel',
                status: 'RECEIVED',
                location: 'HubA',
                ownerType: 'HUB',
                events: []
            }
        ];

        for (const asset of assets) {
            asset.createdAt = new Date().toISOString();
            await ctx.stub.putState(asset.assetId, Buffer.from(JSON.stringify(asset)));
        }
        return `Ledger inicializado com ${assets.length} ativos`;
    }

    // RegisterDonation - regista a doação inicial
    // args: assetId, serialPlaintext, make, model, donorId (hash opcional), metadataHash (IPFS hash ou pointer)
    async RegisterDonation(ctx, assetId, serialPlaintext, make, model, donorId, metadataHash) {
        const exists = await this._assetExists(ctx, assetId);
        if (exists) {
            throw new Error(`Asset ${assetId} já existe`);
        }

        const serialHash = this._sha256(serialPlaintext.toString());

        const asset = {
            assetId,
            serialHash,
            make,
            model,
            status: 'RECEIVED',
            location: 'DONATION_HUB',
            ownerType: 'HUB',
            donorIdHash: donorId ? this._sha256(donorId.toString()) : '',
            metadataHash: metadataHash || '',
            events: []
        };

        const evt = {
            eventType: 'DONATION_REGISTERED',
            actor: 'DONOR',
            timestamp: new Date().toISOString(),
            metadataHash: metadataHash || ''
        };

        asset.events.push(evt);
        asset.createdAt = new Date().toISOString();
        asset.updatedAt = asset.createdAt;

        await ctx.stub.putState(assetId, Buffer.from(JSON.stringify(asset)));

        // Emitir evento on-chain para off-chain listeners
        await ctx.stub.setEvent('DonationRegistered', Buffer.from(JSON.stringify({ assetId, serialHash })));

        return JSON.stringify(asset);
    }

    // RecordIntervention - regista intervenções (DIAG, REPAIR, QA)
    // args: assetId, eventType, technicianId, reportHash (IPFS/S3), location
    async RecordIntervention(ctx, assetId, eventType, technicianId, reportHash, location) {
        const assetStr = await ctx.stub.getState(assetId);
        if (!assetStr || assetStr.length === 0) {
            throw new Error(`Asset ${assetId} não encontrado`);
        }
        const asset = JSON.parse(assetStr.toString());

        const evt = {
            eventType,
            actor: 'TECH',
            technicianHash: this._sha256(technicianId.toString()),
            reportHash: reportHash || '',
            location: location || asset.location,
            timestamp: new Date().toISOString()
        };

        // Atualiza estado dependendo do tipo de evento
        if (eventType === 'DIAGNOSTIC') {
            asset.status = 'DIAGNOSED';
        } else if (eventType === 'REPAIR') {
            asset.status = 'REPAIRED';
        } else if (eventType === 'QA') {
            asset.status = 'QA_PASSED';
        } else if (eventType === 'FAILED_QA') {
            asset.status = 'QA_FAILED';
        }

        asset.events.push(evt);
        asset.updatedAt = new Date().toISOString();
        if (location) asset.location = location;

        await ctx.stub.putState(assetId, Buffer.from(JSON.stringify(asset)));

        await ctx.stub.setEvent('InterventionRecorded', Buffer.from(JSON.stringify({ assetId, eventType })));

        return JSON.stringify(asset);
    }

    // TransferToSchool - transferir posse para uma escola
    // args: assetId, schoolId, transferProofHash
    async TransferToSchool(ctx, assetId, schoolId, transferProofHash) {
        const assetStr = await ctx.stub.getState(assetId);
        if (!assetStr || assetStr.length === 0) {
            throw new Error(`Asset ${assetId} não encontrado`);
        }
        const asset = JSON.parse(assetStr.toString());

        if (asset.status === 'ASSIGNED') {
            throw new Error(`Asset ${assetId} já foi atribuído a um aluno`);
        }

        const evt = {
            eventType: 'TRANSFER_TO_SCHOOL',
            actor: 'STUDENTKEEP',
            schoolHash: this._sha256(schoolId.toString()),
            transferProofHash: transferProofHash || '',
            timestamp: new Date().toISOString()
        };

        asset.events.push(evt);
        asset.status = 'TRANSFERRED_TO_SCHOOL';
        asset.ownerType = 'SCHOOL';
        asset.ownerIdHash = this._sha256(schoolId.toString());
        asset.location = `SCHOOL:${schoolId}`;
        asset.updatedAt = new Date().toISOString();

        await ctx.stub.putState(assetId, Buffer.from(JSON.stringify(asset)));
        await ctx.stub.setEvent('TransferredToSchool', Buffer.from(JSON.stringify({ assetId, schoolHash: asset.ownerIdHash })));
        return JSON.stringify(asset);
    }

    // AssignToStudent - atribuir a aluno; NÃO guardar PII on-chain — usar hash do studentId
    // args: assetId, studentIdPlaintext, assignmentProofHash
    async AssignToStudent(ctx, assetId, studentIdPlaintext, assignmentProofHash) {
        const assetStr = await ctx.stub.getState(assetId);
        if (!assetStr || assetStr.length === 0) {
            throw new Error(`Asset ${assetId} não encontrado`);
        }
        const asset = JSON.parse(assetStr.toString());

        if (asset.status === 'ASSIGNED') {
            throw new Error(`Asset ${assetId} já está atribuído`);
        }

        // Gera hash do studentId para preservar anonimato
        const studentHash = this._sha256(studentIdPlaintext.toString());

        const evt = {
            eventType: 'ASSIGNED_TO_STUDENT',
            actor: 'SCHOOL',
            studentHash,
            assignmentProofHash: assignmentProofHash || '',
            timestamp: new Date().toISOString()
        };

        asset.events.push(evt);
        asset.status = 'ASSIGNED';
        asset.ownerType = 'STUDENT';
        asset.ownerIdHash = studentHash;
        asset.location = `STUDENT:${studentHash}`;
        asset.updatedAt = new Date().toISOString();

        // Opcional: emitir um token / comprovativo (pode ser externalizado)
        await ctx.stub.putState(assetId, Buffer.from(JSON.stringify(asset)));
        await ctx.stub.setEvent('AssignedToStudent', Buffer.from(JSON.stringify({ assetId, studentHash })));
        return JSON.stringify(asset);
    }

    // QueryAsset
    async ReadAsset(ctx, assetId) {
        const assetStr = await ctx.stub.getState(assetId);
        if (!assetStr || assetStr.length === 0) {
            throw new Error(`Asset ${assetId} não encontrado`);
        }
        return assetStr.toString();
    }

    // GetAssetHistory - devolve histórico (transações) do ativo
    async GetAssetHistory(ctx, assetId) {
        const iterator = await ctx.stub.getHistoryForKey(assetId);
        const results = [];
        let res = await iterator.next();
        while (!res.done) {
            const tx = res.value;
            const timestamp = tx.timestamp ? new Date(tx.timestamp.seconds.low * 1000).toISOString() : '';
            results.push({
                txId: tx.txId,
                isDelete: tx.isDelete,
                timestamp,
                value: tx.value.toString('utf8')
            });
            res = await iterator.next();
        }
        await iterator.close();
        return JSON.stringify(results);
    }

    // QueryAllAssets - consulta simplificada (pára em 1000)
    async QueryAllAssets(ctx, startKey, endKey) {
        startKey = startKey || '';
        endKey = endKey || '';
        const iterator = await ctx.stub.getStateByRange(startKey, endKey);
        const allResults = [];
        let res = await iterator.next();
        while (!res.done) {
            const record = res.value;
            const key = record.key;
            const value = record.value.toString('utf8');
            allResults.push({ Key: key, Record: JSON.parse(value) });
            res = await iterator.next();
        }
        await iterator.close();
        return JSON.stringify(allResults);
    }

    // Internal helper
    async _assetExists(ctx, assetId) {
        const data = await ctx.stub.getState(assetId);
        return (!!data && data.length > 0);
    }
}

module.exports = StudentKeepContract;
