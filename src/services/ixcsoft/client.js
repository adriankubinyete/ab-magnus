// ixcsoft.client.js
import axios from 'axios';

class IxcSoftClient {
    constructor({ baseUrl, apiToken, logger = null, timeout = 15000 }) {
        if (!baseUrl || !apiToken) {
            throw new Error("baseUrl and apiToken are required");
        }

        this.logger = logger;

        this.axios = axios.create({
            baseURL: baseUrl,
            timeout: timeout,
            headers: {
                "Content-Type": "application/json",
                Authorization: `Basic ${apiToken}`,
            },
        });

        this.setupInterceptors();
    }

    setupInterceptors() {
        if (!this.logger) return;

        // Interceptador de request
        this.axios.interceptors.request.use(
            (config) => {
                this.logger.debug("HTTP → request", {
                    method: config.method?.toUpperCase(),
                    url: config.url,
                });
                return config;
            },
            (err) => {
                this.logger.error("HTTP → request interceptor error", { error: err });
                return Promise.reject(err);
            }
        );

        // Interceptador de response
        this.axios.interceptors.response.use(
            (res) => {
                this.logger.debug("HTTP ← response", {
                    status: res.status,
                    dataSize: JSON.stringify(res.data ?? {}).length,
                });
                return res;
            },
            (err) => {
                this.logger.error("HTTP ← error", {
                    status: err.response?.status,
                    message: err.message,
                });
                return Promise.reject(err);
            }
        );
    }

    async request(config) {
        const method = (config.method || "get").toUpperCase();
        const url = config.url ?? "sem-url";

        if (method === "GET" && config.data) {
            this.logger?.warn("GET com body detectado (não é padrão HTTP)");
        }

        try {
            const response = await this.axios(config);

            // Tratamento de erro lógico específico do IXC
            const data = response.data;
            if (data?.type === "error") {
                this.logger?.error(`[IxcSoftClient] Erro lógico do IXC: ${data?.message ?? "sem mensagem"}`, {
                    config,
                    data,
                });
                throw new Error(`Erro lógico IXC: ${data.message ?? "ver logs"}`);
            }

            return response;
        } catch (err) {
            this.handleRequestError(err, { method, url });
            throw err;
        }
    }

    handleRequestError(error, context) {
        if (!this.logger) return;

        if (axios.isAxiosError(error)) {
            const status = error.response?.status;
            let message = error.message || "Erro na requisição HTTP";

            const errData = error.response?.data;
            if (errData && typeof errData === "object") {
                message =
                    errData.mensagem ??
                    errData.erro ??
                    errData.message ??
                    message;
            }

            this.logger.error(`request falhou`, {
                ...context,
                status,
                message,
            });
        } else {
            this.logger.error(`request erro inesperado`, {
                ...context,
                error,
            });
        }
    }

    // ────────────────────────────────────────────────
    // Métodos da API IXC
    // ────────────────────────────────────────────────

    async listContracts({ page = 1, limit = 25 } = {}) {
        const response = await this.request({
            method: "GET",
            url: "/webservice/v1/cliente_contrato",
            headers: { ixcsoft: "listar" },
            data: {
                qtype: "cliente_contrato.id_cliente",
                query: 1,
                oper: ">=",
                page: page,
                rp: limit,
                sortname: "cliente_contrato.id",
                sortorder: "desc",
            },
        });
        return response.data;
    }

}

export default IxcSoftClient;