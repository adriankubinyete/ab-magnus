const path = require("path");
const { Logger } = require( path.resolve("src/util/logging") )
const { envBool, getMagnusBillingClient } = require( path.resolve("src/util/Utils") )
const { TagValidator } = require( path.resolve("src/util/TagValidator") )

module.exports = {
    key: 'ListMagnusClients',
    async handle(job, done, Queue) {
        job.data._JOB_INTERNAL_ID = `${module.exports.key}:${job.id}`;
        const log = new Logger(job.data._JOB_INTERNAL_ID, false).useEnvConfig().setJob(job).create()
        const tagValidator = new TagValidator({}, job, job.data.tags)

        if (envBool(process.env.NOTIFY_DISCORD_WHEN_RUNNING_LIST)) {
            Queue.add('DiscordMessage', {
                action: "debug",
                tags: {ORIGINATOR: job.data._JOB_INTERNAL_ID, OVERWRITE_MESSAGE: true},
                message: {title: job.data._JOB_INTERNAL_ID, description: 'Job is running.', thumbnail: "https://www.icegif.com/wp-content/uploads/2022/06/icegif-340.gif"}
            })
        }

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
                nome: client.lastname ?? 'name_not_set',
                usuario: client.username ?? 'user_not_set',
                contrato: client.dist,
                doc: client.doc ?? 'doc_not_set',
                statusMagnus: parseInt(client.active), // 0:inativo | 1:ativo | 2:pendente | 3:bloqueado entrada | 4:bloqueado entrada e saida
                statusIxc: undefined,
                statusIxcVerbose: undefined,
                tags: tagValidator.validatedTags
            }          

            if (!CLIENT_DATA.contrato) {
                // log.trace(`${nome} Não está com contrato setado. Usuário '${usuario}'`)
                // log.trace(`Usuário: ${usuario} / Contrato: ${contrato} / Cliente: ${nome} / Status: ${status}`);
                doesntHaveContract[CLIENT_DATA.usuario] = CLIENT_DATA; // Salvando o dobro, por facilidade :skulll:
                switch (CLIENT_DATA.statusMagnus) {
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
                        job.log(`[WARNING] O usuário ${CLIENT_DATA.usuario} não tem contrato, e está com um status inesperado! ${CLIENT_DATA.statusMagnus}`)
                }
            } else {
                // log.trace(`${nome} Está com contrato setado. Usuário '${CLIENT_DATA.usuario}'`)
                // log.trace(`Usuário: ${CLIENT_DATA.usuario} / Contrato: ${contrato} / Cliente: ${nome} / Status: ${status}`);
                hasContract[CLIENT_DATA.usuario] = CLIENT_DATA; // Salvando o dobro, por facilidade :skulll:
                switch (CLIENT_DATA.statusMagnus) {
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
                        job.log(`[WARNING] O usuário ${CLIENT_DATA.usuario} tem contrato, e está com um status inesperado! ${CLIENT_DATA.statusMagnus}`)
                }
            }
    
            // Atualizando o progresso da job, baseado em (atual/total) * 100, arredondado pra baixo.
            job.progress( Math.floor((counter / total) * 100) )
    
        });
        
        if(job.progress()>=100) {
    
            // Já que terminamos de listar os clientes, vou passar esses dados pra fazer consulta no IXC. é um trabalho novo.
            // console.log(`DRY: absqFind.add(${hasContract}, ${doesntHaveContract})`)
            const { isActive, isInactive, isBlocked, ...filteredHasContract } = hasContract;
            Queue.add('SearchContracts', {
                tags: {ORIGINATOR: job.data._JOB_INTERNAL_ID},
                users: {...filteredHasContract},
            } );

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
