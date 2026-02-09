import webhook from "./discord/webhook-instance.js";

const NOTIFICATION_SETTINGS = {
    BLOCKED: {
        title: 'NOTIFICAÇÃO DE BLOQUEIO',
        color: 0xff3b3b,
    },
    UNBLOCKED: {
        title: 'NOTIFICAÇÃO DE DESBLOQUEIO',
        color: 0x00c950,
    },
    ACTIVATED: {
        title: 'NOTIFICAÇÃO DE ATIVAÇÃO',
        color: 0x3b82f6,
    },
    DEACTIVATED: {
        title: 'NOTIFICAÇÃO DE DESATIVAÇÃO',
        color: 0xf97316,
    },
};

export const NOTIFICATION_TYPES = Object.keys(NOTIFICATION_SETTINGS);

function buildTemplate(kv = {}) {
    let msg = `- **Tipo**: \`Linha\``;
    let first = true;

    for (const [key, value] of Object.entries(kv)) {
        msg += `\n- **${key}**: \`${value}\``;
    }

    return msg;
}

export async function sendNotification(data = {}) {
    console.log(`Datas is: ${JSON.stringify(data)}}`);
    if (!data || data?.type === undefined || !NOTIFICATION_TYPES.includes(data.type)) throw new Error('Invalid notification type');
    const { type, ...remainderOfData } = data;
    return webhook.sendEmbed({
        ...NOTIFICATION_SETTINGS[type],
        description: buildTemplate(remainderOfData),
    });
}

