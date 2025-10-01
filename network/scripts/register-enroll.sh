#!/bin/bash
# Uso: ./register-enroll.sh ORG_NAME ORG_DOMAIN CA_URL

ORG=$1
DOMAIN=$2
CA_URL=$3   # ex: https://ca-manager:7054

export FABRIC_CA_CLIENT_HOME=${PWD}/crypto-config/peerOrganizations/${DOMAIN}/

# 1) enroll CA admin (bootstrap)
fabric-ca-client enroll -u https://admin:adminpw@${CA_URL} --tls.certfiles ${PWD}/ca-cert.pem

# 2) register peer and org admin
fabric-ca-client register --id.name peer0 --id.secret peerpw --id.type peer -u ${CA_URL}
fabric-ca-client register --id.name orgadmin --id.secret adminpw --id.type admin -u ${CA_URL}

# 3) enroll peer0
fabric-ca-client enroll -u https://peer0:peerpw@${CA_URL} -M ${FABRIC_CA_CLIENT_HOME}/peers/peer0.${DOMAIN}/msp --csr.hosts peer0.${DOMAIN} --tls.certfiles ${PWD}/ca-cert.pem

# 4) enroll org admin
fabric-ca-client enroll -u https://orgadmin:adminpw@${CA_URL} -M ${FABRIC_CA_CLIENT_HOME}/users/Admin@${DOMAIN}/msp --tls.certfiles ${PWD}/ca-cert.pem
