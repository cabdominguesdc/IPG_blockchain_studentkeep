# gerar blocos genesis
export FABRIC_CFG_PATH=$PWD
configtxgen -profile TwoOrgsOrdererGenesis -channelID system-channel -outputBlock ./genesis.block

# criar tx do canal
configtxgen -profile ChannelProfile -outputCreateChannelTx ./channel.tx -channelID sharedchannel
