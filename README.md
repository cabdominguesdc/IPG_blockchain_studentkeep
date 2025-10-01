# IPG_blockchain_studentkeep

Repositório de projeto do IPG - Blockchain 

Resumo da arquitectura funcional proposta

•	Organizações (10):

o	Entidade gestora (ManagerOrg) — coordenação do consórcio

o	5 × IPSS (IPSS1, … , IPSS5) — pontos de recolha/recondicionamento

o	3 × Câmaras Municipais (CAM1, ..., CAM3) — entidades locais

o	1 × Universidade (UNI) — validação/inspeção e formação

•	Peers: 1 peer por org (podes escalar depois). Pede-se mínimo 5 peers, mas sugiro 10 (um por org).

•	Orderer: cluster RAFT (3 nós mínimos) gerido pela Entidade gestora (ou consórcio).

•	CAs: 1 Fabric CA por org (em total 10 CAs) para registar/enrolar identidades.

•	Channel(s):

o	sharedchannel — canal onde é registada a cadeia de custódia dos equipamentos (inclui todas as orgs).

o	Usar Private Data Collections (PDC) para dados pessoais dos beneficiários (acesso restrito a subset de orgs).

•	Chaincode: smart contract (Node.js) que modela o ciclo de vida do equipamento e aplica regras de autorização (baseado em atributos dos certificados).

•	Aplicações Web:

o	Portal técnico (técnicos de reparação) — web app para registar diagnóstico, reparo, testes. Com versão mobile responsiva.

o	Portal beneficiário — solicitar / aceitar equipamento (com PII protegida). Com versão mobile responsiva.

o	Portal administrador — gestão de identidades, auditoria, relatórios.


Cada organização idealmente corre o seu peer e CA na sua infraestrutura (ouchezcloud/VMs/Kubernetes).

Abrir portas necessárias (gRPC TLS) entre peers e orderers com VPN / VPC peering para segurança.

Monitorização: Prometheus (Fabric metrics exporter) + Grafana.

Logging: centralizar logs (ELK/Graylog).

Testes: e2e com fabric-samples como referência.


Workflow para chaincode:

push para branch => Jenkins Pipeline:

Instalar dependências (npm)

Lint & unit tests

Package chaincode (tar.gz)

(Opcional) Fazer peer lifecycle chaincode install nos peers de dev (se CI tiver acesso)

Mantém scripts/ para packageChaincode.sh, installChaincode.sh, approveAndCommit.sh.