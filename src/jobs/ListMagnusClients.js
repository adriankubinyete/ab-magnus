const path = require("path");
const { generateLogger } = require( path.resolve("src/util/logging") )
const { getMagnusBillingClient } = require( path.resolve("src/util/Utils") )

let MAG_LOG_NAME = "p:ListMagnusClients"
let MAG_LOG_LOCATION = "logs/app"
let MAG_LOG_LEVEL = 10
let MAG_LOG_FILE_LEVEL = 10
let MAG_LOG_FILE_ROTATE = "30d"

module.exports = {
    key: 'ListMagnusClients',
    async handle(job, done, Queue) {
        const log = generateLogger(`${MAG_LOG_NAME}:${job.id}`, path.resolve(MAG_LOG_LOCATION), MAG_LOG_LEVEL, MAG_LOG_FILE_LEVEL, MAG_LOG_FILE_ROTATE);

        let mb = getMagnusBillingClient();
        let result = await mb.clients.users.list({limit: 9999});

        // Confirmando que houve resultado
        if (!result) { throw new Error('Sem resultados') };
        
        // Consultando o total de resultados
        if ( result.hasOwnProperty('count') ) {
            job.log(`Clientes totais: ${result.count}`);
        }

        // result.count = no sistema, com o filtro que usou, quantos clientes existem
        // result.rows.length = o que foi retornado pra mim, detalhadamente (paginado)
        if (result.count > result.rows.length) { job.log('[WARNING] A quantidade de clientes é maior que a quantidade de resultados retornados. Sua requisição está com resultados limitados e não afeta a base inteira de clientes!')}
        job.log(`[INFO] Clientes retornados baseado em 'result.rows': ${result.rows.length}`);

        // Iterando sobre cada cliente retornado, para verificar se está bloqueado ou não.
        let counter = 0;
        let total = result.rows.length;
        let doesntHaveContract = { "isActive":{}, "isInactive":{}, "isBlocked":{} };
        let hasContract = { "isActive":{}, "isInactive":{}, "isBlocked":{} };
        result.rows.forEach(client => {
            counter++
            let CLIENT_DATA = {
                nome: client.lastname,
                usuario: client.username,
                contrato: client.dist,
                status: parseInt(client.active), // 0:inativo | 1:ativo | 2:pendente | 3:bloqueado entrada | 4:bloqueado entrada e saida
                // cpfcnpj: client.cpf_cnpj,
            }          

            if (!CLIENT_DATA.contrato) {
                // log.trace(`${nome} Não está com contrato setado. Usuário '${usuario}'`)
                // log.trace(`Usuário: ${usuario} / Contrato: ${contrato} / Cliente: ${nome} / Status: ${status}`);
                doesntHaveContract[CLIENT_DATA.usuario] = CLIENT_DATA; // Salvando o dobro, por facilidade :skulll:
                switch (CLIENT_DATA.status) {
                    case 0:
                        doesntHaveContract.isInactive[CLIENT_DATA.usuario] = CLIENT_DATA;
                        break;
                    case 1:
                        doesntHaveContract.isActive[CLIENT_DATA.usuario] = CLIENT_DATA;
                        break;
                    case 3:
                        doesntHaveContract.isBlocked[CLIENT_DATA.usuario] = CLIENT_DATA;
                        break;
                    case 4:
                        doesntHaveContract.isBlocked[CLIENT_DATA.usuario] = CLIENT_DATA;
                        break;
                    default:
                        job.log(`[WARNING] O usuário ${CLIENT_DATA.usuario} não tem contrato, e está com um status inesperado! ${CLIENT_DATA.status}`)
                }
            } else {
                // log.trace(`${nome} Está com contrato setado. Usuário '${CLIENT_DATA.usuario}'`)
                // log.trace(`Usuário: ${CLIENT_DATA.usuario} / Contrato: ${contrato} / Cliente: ${nome} / Status: ${status}`);
                hasContract[CLIENT_DATA.usuario] = CLIENT_DATA; // Salvando o dobro, por facilidade :skulll:
                switch (CLIENT_DATA.status) {
                    case 0:
                        hasContract.isInactive[CLIENT_DATA.usuario] = CLIENT_DATA;
                        break;
                    case 1:
                        hasContract.isActive[CLIENT_DATA.usuario] = CLIENT_DATA;
                        break;
                    case 3:
                        hasContract.isBlocked[CLIENT_DATA.usuario] = CLIENT_DATA;
                        break;
                    case 4:
                        hasContract.isBlocked[CLIENT_DATA.usuario] = CLIENT_DATA;
                        break;
                    default:
                        job.log(`[WARNING] O usuário ${CLIENT_DATA.usuario} tem contrato, e está com um status inesperado! ${CLIENT_DATA.status}`)
                }
            }
    
            // Atualizando o progresso da job, baseado em (atual/total) * 100, arredondado pra baixo.
            job.progress( Math.floor((counter / total) * 100) )
    
        });
        
        if(job.progress()>=100) {
    
            // Já que terminamos de listar os clientes, vou passar esses dados pra fazer consulta no IXC. é um trabalho novo.
            // console.log(`DRY: absqFind.add(${hasContract}, ${doesntHaveContract})`)
            const { isActive, isInactive, isBlocked, ...filteredHasContract } = hasContract;
            Queue.add('SearchContracts', {...filteredHasContract});

            log.test(`hc:Total = ${Object.keys(hasContract).length - 3}`);
            log.test(`Fhc:Total = ${Object.keys(filteredHasContract).length}`);

            done(null, {
                hasContract: {
                    total: Object.keys(hasContract).length - 3,
                    active: Object.keys(hasContract.isActive).length,
                    inactive: Object.keys(hasContract.isInactive).length,
                    blocked: Object.keys(hasContract.isBlocked).length,
                },
                doesntHaveContract: {
                    total: Object.keys(doesntHaveContract).length - 3,
                    active: Object.keys(doesntHaveContract.isActive).length,
                    inactive: Object.keys(doesntHaveContract.isInactive).length,
                    blocked: Object.keys(doesntHaveContract.isBlocked).length,
                },
            })

        }

    }

}
