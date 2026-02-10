import webhook from "./discord/webhook-instance.js";

const NOTIFICATION_SETTINGS = {
    BLOCKED: {
        title: 'NOTIFICAÇÃO DE BLOQUEIO',
        color: 0xff3b3b,
        thumbnail: {
            url: 'https://em-content.zobj.net/source/twitter/103/lock_1f512.png'
        }
    },
    UNBLOCKED: {
        title: 'NOTIFICAÇÃO DE DESBLOQUEIO',
        color: 0x00c950,
        thumbnail: {
            url: 'https://em-content.zobj.net/source/twitter/450/unlocked_1f513.png'
        }
    },
    ACTIVATED: {
        title: 'NOTIFICAÇÃO DE ATIVAÇÃO',
        color: 0x3b82f6,
        thumbnail: {
            url: 'https://em-content.zobj.net/source/toss-face/381/check-mark-button_2705.png'
        }
    },
    DEACTIVATED: {
        title: 'NOTIFICAÇÃO DE DESATIVAÇÃO',
        color: 0xf97316,
        thumbnail: {
            url: 'https://em-content.zobj.net/source/toss-face/381/cross-mark-button_274e.png'
        },
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

