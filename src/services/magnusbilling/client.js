/**
 * MagnusBilling API Client (JavaScript / Node.js & Browser)
 *
 * Versão com axios em vez de fetch nativo.
 * Mantém a mesma lógica de autenticação HMAC-SHA512.
 *
 * @example
 * const client = new MagnusBillingClient(
 *   'SUA_API_KEY',
 *   'SUA_API_SECRET',
 *   'https://seu.dominio/mbilling'
 * );
 *
 * const dids = await client.read('did', 1);
 */

import axios from 'axios';

export class MagnusBillingClient {
    /**
     * @param {string} apiKey      - Chave da API
     * @param {string} apiSecret   - Segredo usado na assinatura HMAC
     * @param {string} baseUrl     - URL base (ex: https://billing.exemplo.com)
     */
    constructor({ apiKey, apiSecret, baseUrl }) {
        if (!apiKey || !apiSecret || !baseUrl) {
            throw new Error('apiKey, apiSecret and baseUrl are required');
        }

        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

        // Instância axios reutilizável (você pode configurar defaults aqui se quiser)
        this.axios = axios.create({
            timeout: 30000,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });
    }

    /**
     * Método principal de comunicação com a API
     * @private
     * @param {Object} params - Parâmetros que serão enviados via POST
     * @returns {Promise<Object>} Resposta JSON da API
     */
    async #query(params = {}) {
        // Nonce (tentativa de ser único o suficiente)
        const now = performance.now() * 1e3;
        const nonce = `${Math.floor(Date.now() / 1000)}${Math.floor(now % 1000000)
            .toString()
            .padStart(6, '0')}`;

        const payload = {
            nonce,
            ...params,
        };

        // Monta string para assinatura
        const postData = new URLSearchParams(payload).toString();

        // HMAC-SHA512 usando Web Crypto (browser + Node 18+)
        const encoder = new TextEncoder();
        const keyData = encoder.encode(this.apiSecret);
        const dataToSign = encoder.encode(postData);

        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            keyData,
            { name: 'HMAC', hash: 'SHA-512' },
            false,
            ['sign']
        );

        const signature = await crypto.subtle.sign('HMAC', cryptoKey, dataToSign);
        const signHex = Array.from(new Uint8Array(signature))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');

        const headers = {
            Key: this.apiKey,
            Sign: signHex,
        };

        const url = `${this.baseUrl}/index.php/${params.module || ''}/${params.action || ''}`;

        try {
            const response = await this.axios.post(url, postData, { headers });

            // Tenta parsear JSON
            if (typeof response.data === 'object') {
                return response.data;
            }

            // Caso venha string (às vezes acontece em erros do Magnus)
            try {
                return JSON.parse(response.data);
            } catch {
                console.error('Non-JSON response:', response.data);
                throw new Error('MagnusBilling response is not a valid JSON.');
            }
        } catch (error) {
            if (error.response) {
                const status = error.response.status;
                let message = 'Erro desconhecido na resposta da API';

                if (error.response.data) {
                    if (typeof error.response.data === 'object' && error.response.data.message) {
                        message = error.response.data.message;
                    } else if (typeof error.response.data === 'string') {
                        try {
                            const parsed = JSON.parse(error.response.data);
                            message = parsed.message || parsed.error || error.response.data;
                        } catch {
                            message = error.response.data;
                        }
                    }
                }

                const err = new Error(`MagnusBillingClient: API error ${status}: ${message}`);
                err.status = status;
                throw err;
            }

            if (error.code) {

                if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
                    const err = new Error('MagnusBillingClient: Request timed out.');
                    throw err;
                }

                if (error.code === 'ERR_NETWORK' ||
                    error.message.includes('Network Error') ||
                    error.code === 'ENOTFOUND' ||
                    error.code === 'ERR_NAME_NOT_RESOLVED') {
                    const err = new Error('MagnusBillingClient: Network unavailable or server unreachable.');
                    throw err;
                }
            }

            const err = new Error(`MagnusBillingClient: Unknown error: ${error.code} - ${error.message}`);
            throw err;
        }
    }

    // ──────────────────────────────────────────────
    // Métodos CRUD genéricos
    // ──────────────────────────────────────────────

    async create(module, data = {}, action = 'save') {
        return this.#query({
            module,
            action,
            id: 0,
            ...data,
        });
    }

    async update(module, id, data) {
        return this.#query({
            module,
            action: 'save',
            id,
            ...data,
        });
    }

    async destroy(module, id) {
        return this.#query({
            module,
            action: 'destroy',
            id,
        });
    }

    async read(module, page = 1, action = 'read', limit = 25) {
        const start = page === 1 ? 0 : (page - 1) * limit;

        return this.#query({
            module,
            action,
            page,
            start,
            limit,
            filter: JSON.stringify(this.filter || []),
        });
    }

    // ──────────────────────────────────────────────
    // Métodos específicos
    // ──────────────────────────────────────────────

    async listUsers(page = 1, limit = 25) {
        return this.read('user', page, undefined, limit);
    }

    async getFields(module) {
        return this.#query({ module, getFields: 1 });
    }

    async getModules() {
        return this.#query({ getModules: 1 });
    }


    // ──────────────────────────────────────────────
    // Filtros (mantido igual ao original)
    // ──────────────────────────────────────────────

    filter = [];

    setFilter(field, value, comparison = 'st', type = 'string') {
        this.filter.push({ type, field, value, comparison });
    }

    clearFilter() {
        this.filter = [];
    }

    async getId(module, field, value) {
        this.setFilter(field, value, 'eq');
        const result = await this.read(module, 1, 'read', 1);
        this.clearFilter();
        return result?.rows?.[0]?.id ?? null;
    }
}

export default MagnusBillingClient;
