## Contextualização
Este projeto tem em mente uma necessidade emergente em nossa empresa: Utilizamos dois sistemas, o [IXCSoft](https://ixcsoft.com/), para controle interno de clientes, cobranças, chamadoas, dentre outras features relevantes.
e, irrelacionado com o IXCSoft, também provemos linhas telefônicas através do software opensource [MagnusBilling](https://www.magnusbilling.org/) ([repositório](https://github.com/magnussolution/magnusbilling7)), para ligações PASSIVAS (entrada) e ATIVAS (saída).
Diversos de nossos clientes acabam não pagando as faturas de seus contratos, e os mesmos acabam sendo bloqueados através do nosso sistema de controle de clientes, o IXCSoft.
Entretanto, mesmo com o contrato bloqueado, os mesmos ainda conseguem usufruir dos serviços sem problemas, devido à falta de integração entre o IXCSoft e o MagnusBilling que atenda a esta necessidade específica de nossa empresa.


## Explicação do projeto
Este serviço tem a intenção de, a cada 1 hora (configurável), consultar todos os clientes do MagnusBilling.
Para cada cliente que TEM UM CONTRATO CONFIGURADO NELE, o mesmo será consultado no IXC.
Tendo o status do MagnusBilling (ativo, inativo, bloqueado), e o status do IXCSoft (ativo, inativo, bloqueado), será feito uma das seguintes ações:

- NoChange - Sem mudança
- Block - Ativo -> Bloqueado
- Unblock - Bloqueado -> Ativo
- Disable - Ativo/Bloqueado -> Inativo
- Enable - Inativo(*) -> Ativo

Baseado na ação tomada, uma mensagem correspondente será encaminhada via Webhook no [Discord](https://discord.com/), e a ação será efetuada de fato no MagnusBilling, para manter o cadastro no sistema em igualdade com o IXCSoft

## Objetivos
Bloquear dividendos.
Evitar utilização indevida de nossos serviços.
Informação interna através das mensagens no Discord.

## Outras informações
Docker: `version 25.0.3, build 4debf41` (dev-environment)
docker-compose: `version v2.24.6-desktop.1` (dev-environment)
NodeJS: `v16.20.2` (dev-environment)

## Quickstart
<to-do>

## Bull Dashboard
O endpoint para acesso à dashboard do Bull pode ser editado através do parâmetro `BULL_DASHBOARD_ROUTE`, por padrão sendo configurado como `/admin/queues`, podendo ser acessado em `localhost:3000/admin/queues`, sendo localhost o endereço do servidor que está rodando o serviço, e 3000 sendo a porta mapeada do Express.

## QueueController Endpoints
É possível controlar* as Jobs do Bull através do endpoint `/bull/queues/add` e `/bull/queues/obliterate`.
Segue alguns exemplos:

- Obliterar as informações de uma fila
```json
/bull/queues/obliterate
{
  "queue": ["SearchContracts","ListMagnusClients","EnableClient","DisableClient","BlockClient","DiscordMessage","UnblockClient"],
  "config": {"force": true}
}
```

- Adicionando um trabalho de listagem (coleta todos usuários do Magnus, e efetua a consulta de cada um para bloquear, desbloquear, etc...)
```json
/bull/queues/add
{
  "queue": "ListMagnusClients",
  "data": {
    "tags": {
      "ORIGINATOR": "API",
      "DRY": true
    }
  },
  "config": {
    "delay": 2000, 
    "attempts": 0
  }
}
```

- Adicionando um trabalho de atualização para um cliente específico
```json
/bull/queues/add
{
  "queue": "SearchContracts",
  "data": {
    "tags": {
        "ORIGINATOR": "API"
    },
    "users": {
      "<USUARIO>": {
        "nome": "<EMPRESA>",
        "usuario": "<USUARIO>",
        "contrato": "<CONTRATO>",
        "doc": "<CNPJ>",
        "status": "1"
      }
    }
  },
  "config": {
    "delay": 5000, 
    "attempts": 0
  }
}
```
  
## Agradecimentos e dedicatórias
Agradeço pelo auxilio de [Rafael Rizzo](https://github.com/rafaelRizzo), com o NodeJS.
Dedico este trabalho ao meu gato Jonas.
