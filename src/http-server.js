import express from 'express';
import { runStatusSync } from './jobs/status-sync.job.js';

export function startHttpServer() {
    const app = express();
    const port = process.env.HTTP_SYNC_PORT || 3000;

    app.use(express.json());

    app.post('/sync', async (req, res) => {
        if (req.headers.authorization !== `Bearer ${process.env.HTTP_SYNC_TOKEN}`) {
            return res.status(401).json({ ok: false });
        }

        try {
            console.log('> HTTP sync triggered');

            const changes = await runStatusSync();

            res.json({
                ok: true,
                message: 'Status sync executed, changes published: ' + changes,
            });
        } catch (err) {
            console.error('❌ Sync failed', err);
            res.status(500).json({
                ok: false,
                error: err.message,
            });
        }
    });

    app.listen(port, () => {
        console.log(`🌐 HTTP server listening on port ${port}`);
    });
}
