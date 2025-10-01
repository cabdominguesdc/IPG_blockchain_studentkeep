#!/bin/bash
# Uso: register-identity.sh caUrl caAdminPW idName idSecret idType roleAttr orgAttr

CA_URL=$1
CA_ADMIN_USER=$2  # ex: admin
CA_ADMIN_PW=$3
ID_NAME=$4
ID_SECRET=$5
ID_TYPE=$6  # user or peer or admin ...
ROLE_ATTR=$7  # role:technician
ORG_ATTR=$8   # org:IPSS1

# Enroll admin
fabric-ca-client enroll -u https://${CA_ADMIN_USER}:${CA_ADMIN_PW}@${CA_URL} --tls.certfiles ./ca-cert.pem

# Register new identity with attributes
fabric-ca-client register --id.name ${ID_NAME} --id.secret ${ID_SECRET} --id.type ${ID_TYPE} --id.attrs "${ROLE_ATTR}:ecert,${ORG_ATTR}:ecert" -u https://${CA_URL} --tls.certfiles ./ca-cert.pem

# Enroll identity to obtain cert
fabric-ca-client enroll -u https://${ID_NAME}:${ID_SECRET}@${CA_URL} -M ./wallet/${ID_NAME}/msp --tls.certfiles ./ca-cert.pem
