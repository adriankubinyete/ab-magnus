// discord/client.js
import axios from 'axios';

class DiscordWebhookClient {
    constructor({ webhookUrl, logger = null, timeout = 10000 }) {
        if (!webhookUrl) {
            throw new Error("webhookUrl is required");
        }

        this.webhookUrl = webhookUrl;
        this.logger = logger;

        this.axios = axios.create({
            baseURL: webhookUrl,
            timeout: timeout,
            headers: {
                "Content-Type": "application/json",
            },
        });

        this.setupInterceptors();
    }

    setupInterceptors() {
        if (!this.logger) return;

        // Request interceptor
        this.axios.interceptors.request.use(
            (config) => {
                this.logger.debug("Discord → request", {
                    method: config.method?.toUpperCase(),
                    // não loga a url completa por segurança (contém token)
                    url: "(webhook)",
                });
                return config;
            },
            (err) => {
                this.logger.error("Discord → request interceptor error", { error: err });
                return Promise.reject(err);
            }
        );

        // Response interceptor
        this.axios.interceptors.response.use(
            (res) => {
                this.logger.debug("Discord ← response", {
                    status: res.status,
                    // webhooks normais retornam 204 No Content quando ok
                });
                return res;
            },
            (err) => {
                this.logger.error("Discord ← error", {
                    status: err.response?.status,
                    message: err.message,
                    data: err.response?.data,
                });
                return Promise.reject(err);
            }
        );
    }

    /**
     * Envia uma mensagem simples ou com embeds
     * @param {string|object} message - string ou objeto completo {content, embeds, username, avatar_url, ...}
     * @param {object} [options] - opções adicionais (username, avatar_url, etc)
     */
    async send(message, options = {}) {
        let payload = {};

        if (typeof message === "string") {
            payload.content = message;
        } else if (message && typeof message === "object") {
            payload = { ...message };
        } else {
            throw new Error("send() requires a string or object as message");
        }

        // Sobrescreve com options se existirem
        if (options.username) payload.username = options.username;
        if (options.avatar_url) payload.avatar_url = options.avatar_url;
        if (options.tts !== undefined) payload.tts = !!options.tts;

        try {
            const response = await this.axios.post("", payload); // url vazia porque baseURL já tem o webhook completo

            if (response.status !== 204) {
                this.logger?.warn("Unexpected response status", { status: response.status });
            }

            return response;
        } catch (err) {
            this.handleError(err);
            throw err;
        }
    }

    /**
     * Método de conveniência para enviar embed simples
     */
    async sendEmbed(embed, options = {}) {
        return this.send({
            embeds: [embed],
        }, options);
    }

    handleError(error) {
        if (!this.logger) return;

        if (axios.isAxiosError(error)) {
            const status = error.response?.status;
            let message = error.message;

            const errData = error.response?.data;
            if (errData) {
                // Discord geralmente retorna { message: "...", code: ... }
                message = errData.message || errData.error || message;
            }

            this.logger.error(`Discord webhook failed`, {
                status,
                message,
                code: errData?.code,
            });
        } else {
            this.logger.error(`Unexpected Discord webhook error`, { error });
        }
    }
}

export default DiscordWebhookClient;