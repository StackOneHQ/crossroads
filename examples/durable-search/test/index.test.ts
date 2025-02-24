import { env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import app from '../server/index'

describe('Test the application', () => {
    it('Should return 200 response', async () => {
        const res = await app.request('/', {}, env)
        expect(res.status).toBe(200)
    })
    it('should return 404 for unknown routes', async () => {
        const res = await app.request('/unknown', {});
        expect(res.status).toBe(404);
    })
})