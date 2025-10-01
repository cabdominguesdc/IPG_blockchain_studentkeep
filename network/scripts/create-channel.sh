#!/bin/bash
export CORE_PEER_LOCALMSPID="ManagerOrgMSP"
export CORE_PEER_MSPCONFIGPATH=/path/to/manager/admin/msp
peer channel create -o orderer.example.com:7050 -c sharedchannel -f ./channel.tx --outputBlock ./sharedchannel.block
peer channel join -b ./sharedchannel.block
