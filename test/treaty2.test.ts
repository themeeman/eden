import { Elysia, t } from 'elysia'
import { treaty } from '../src'

import { describe, expect, it, beforeAll, afterAll } from 'bun:test'

const app = new Elysia()
    .get('/', 'a')
    .post('/', 'a')
    .get('/number', () => 1)
    .get('/true', () => true)
    .get('/false', () => false)
    .post('/array', ({ body }) => body, {
        body: t.Array(t.String())
    })
    .post('/mirror', ({ body }) => body)
    .post('/body', ({ body }) => body, {
        body: t.String()
    })
    .delete('/empty', ({ body }) => ({ body: body ?? null }))
    .post('/deep/nested/mirror', ({ body }) => body, {
        body: t.Object({
            username: t.String(),
            password: t.String()
        })
    })
    .get('/query', ({ query }) => query, {
        query: t.Object({
            username: t.String()
        })
    })
    .get('/queries', ({ query }) => query, {
        query: t.Object({
            username: t.String(),
            alias: t.Literal('Kristen')
        })
    })
    .post('/queries', ({ query }) => query, {
        query: t.Object({
            username: t.String(),
            alias: t.Literal('Kristen')
        })
    })
    .head('/queries', ({ query }) => query, {
        query: t.Object({
            username: t.String(),
            alias: t.Literal('Kristen')
        })
    })
    .group('/nested', (app) => app.guard((app) => app.get('/data', () => 'hi')))
    .get('/error', ({ error }) => error("I'm a teapot", 'Kirifuji Nagisa'), {
        response: {
            200: t.Void(),
            418: t.Literal('Kirifuji Nagisa'),
            420: t.Literal('Snoop Dogg')
        }
    })
    .get(
        '/headers',
        ({ headers: { username, alias } }) => ({ username, alias }),
        {
            headers: t.Object({
                username: t.String(),
                alias: t.Literal('Kristen')
            })
        }
    )
    .post(
        '/headers',
        ({ headers: { username, alias } }) => ({ username, alias }),
        {
            headers: t.Object({
                username: t.String(),
                alias: t.Literal('Kristen')
            })
        }
    )
    .get(
        '/headers-custom',
        ({ headers, headers: { username, alias } }) => ({
            username,
            alias,
            'x-custom': headers['x-custom']
        }),
        {
            headers: t.Object({
                username: t.String(),
                alias: t.Literal('Kristen'),
                'x-custom': t.Optional(t.Literal('custom'))
            })
        }
    )
    .post('/date', ({ body: { date } }) => date, {
        body: t.Object({
            date: t.Date()
        })
    })
    .get(
        '/redirect',
        ({ set }) => (set.redirect = 'http://localhost:8083/true')
    )
    .post(
        '/redirect',
        ({ set }) => (set.redirect = 'http://localhost:8083/true'),
        {
            body: t.Object({
                username: t.String()
            })
        }
    )

const client = treaty(app)

describe('Treaty2', () => {
    it('get index', async () => {
        const { data, error } = await client.index.get()

        expect(data).toBe('a')
        expect(error).toBeNull()
    })

    it('post index', async () => {
        const { data, error } = await client.index.post()

        expect(data).toBe('a')
        expect(error).toBeNull()
    })

    it('parse number', async () => {
        const { data } = await client.number.get()

        expect(data).toEqual(1)
    })

    it('parse true', async () => {
        const { data } = await client.true.get()

        expect(data).toEqual(true)
    })

    it('parse false', async () => {
        const { data } = await client.false.get()

        expect(data).toEqual(false)
    })

    it('post array', async () => {
        const { data } = await client.array.post(['a', 'b'])

        expect(data).toEqual(['a', 'b'])
    })

    it('post body', async () => {
        const { data } = await client.body.post('a')

        expect(data).toEqual('a')
    })

    it('post mirror', async () => {
        const body = { username: 'A', password: 'B' }

        const { data } = await client.mirror.post(body)

        expect(data).toEqual(body)
    })

    it('delete empty', async () => {
        const { data } = await client.empty.delete()

        expect(data).toEqual({ body: null })
    })

    it('post deep nested mirror', async () => {
        const body = { username: 'A', password: 'B' }

        const { data } = await client.deep.nested.mirror.post(body)

        expect(data).toEqual(body)
    })

    it('get query', async () => {
        const query = { username: 'A' }

        const { data } = await client.query.get({
            query
        })

        expect(data).toEqual(query)
    })

    it('get queries', async () => {
        const query = { username: 'A', alias: 'Kristen' } as const

        const { data } = await client.queries.get({
            query
        })

        expect(data).toEqual(query)
    })

    it('post queries', async () => {
        const query = { username: 'A', alias: 'Kristen' } as const

        const { data } = await client.queries.post(null, {
            query
        })

        expect(data).toEqual(query)
    })

    it('head queries', async () => {
        const query = { username: 'A', alias: 'Kristen' } as const

        const { data } = await client.queries.post(null, {
            query
        })

        expect(data).toEqual(query)
    })

    it('get nested data', async () => {
        const { data } = await client.nested.data.get()

        expect(data).toEqual('hi')
    })

    it('handle error', async () => {
        const { data, error } = await client.error.get()

        let value

        if (error)
            switch (error.status) {
                case 418:
                    value = error.value
                    break

                case 420:
                    value = error.value
                    break
            }

        expect(data).toBeNull()
        expect(value).toEqual('Kirifuji Nagisa')
    })

    it('get headers', async () => {
        const headers = { username: 'A', alias: 'Kristen' } as const

        const { data } = await client.headers.get({
            headers
        })

        expect(data).toEqual(headers)
    })

    it('post headers', async () => {
        const headers = { username: 'A', alias: 'Kristen' } as const

        const { data } = await client.headers.post(null, {
            headers
        })

        expect(data).toEqual(headers)
    })

    it('handle interception', async () => {
        const client = treaty(app, {
            onRequest(path) {
                if (path === '/headers-custom')
                    return {
                        headers: {
                            'x-custom': 'custom'
                        }
                    }
            },
            async onResponse(response) {
                return { intercepted: true, data: await response.json() }
            }
        })

        const headers = { username: 'a', alias: 'Kristen' } as const

        const { data } = await client['headers-custom'].get({
            headers
        })

        expect(data).toEqual({
            // @ts-expect-error
            intercepted: true,
            data: {
                ...headers,
                'x-custom': 'custom'
            }
        })
    })

    it('handle interception array', async () => {
        const client = treaty(app, {
            onRequest: [
                () => ({
                    headers: {
                        'x-custom': 'a'
                    }
                }),
                () => ({
                    headers: {
                        'x-custom': 'custom'
                    }
                })
            ],
            onResponse: [
                () => {},
                async (response) => {
                    return { intercepted: true, data: await response.json() }
                }
            ]
        })

        const headers = { username: 'a', alias: 'Kristen' } as const

        const { data } = await client['headers-custom'].get({
            headers
        })

        expect(data).toEqual({
            // @ts-expect-error
            intercepted: true,
            data: {
                ...headers,
                'x-custom': 'custom'
            }
        })
    })

    it('accept headers configuration', async () => {
        const client = treaty(app, {
            headers(path) {
                if (path === '/headers-custom')
                    return {
                        'x-custom': 'custom'
                    }
            },
            async onResponse(response) {
                return { intercepted: true, data: await response.json() }
            }
        })

        const headers = { username: 'a', alias: 'Kristen' } as const

        const { data } = await client['headers-custom'].get({
            headers
        })

        expect(data).toEqual({
            // @ts-expect-error
            intercepted: true,
            data: {
                ...headers,
                'x-custom': 'custom'
            }
        })
    })

    it('accept headers configuration array', async () => {
        const client = treaty(app, {
            headers: [
                (path) => {
                    if (path === '/headers-custom')
                        return {
                            'x-custom': 'custom'
                        }
                }
            ],
            async onResponse(response) {
                return { intercepted: true, data: await response.json() }
            }
        })

        const headers = { username: 'a', alias: 'Kristen' } as const

        const { data } = await client['headers-custom'].get({
            headers
        })

        expect(data).toEqual({
            // @ts-expect-error
            intercepted: true,
            data: {
                ...headers,
                'x-custom': 'custom'
            }
        })
    })

    it('send date', async () => {
        const { data } = await client.date.post({ date: new Date() })

        expect(data).toBeInstanceOf(Date)
    })

    it('redirect should set location header', async () => {
        const { headers, status } = await client['redirect'].get({
            fetch: {
                redirect: 'manual'
            }
        })
        expect(status).toEqual(302)
        expect(new Headers(headers).get('location')).toEqual(
            'http://localhost:8083/true'
        )
    })
})

describe('Treaty2 - Using endpoint URL', () => {
    const treatyApp = treaty<typeof app>('http://localhost:8083')

    beforeAll(async () => {
        await new Promise((resolve) => {
            app.listen(8083, () => {
                resolve(null)
            })
        })
    })

    afterAll(() => {
        app.stop()
    })

    it('redirect should set location header', async () => {
        const { headers, status } = await treatyApp.redirect.get({
            fetch: {
                redirect: 'manual'
            }
        })
        expect(status).toEqual(302)
        expect(new Headers(headers).get('location')).toEqual(
            'http://localhost:8083/true'
        )
    })

    it('redirect should set location header with post', async () => {
        const { headers, status } = await treatyApp.redirect.post(
            {
                username: 'a'
            },
            {
                fetch: {
                    redirect: 'manual'
                }
            }
        )
        expect(status).toEqual(302)
        expect(new Headers(headers).get('location')).toEqual(
            'http://localhost:8083/true'
        )
    })

    it('doesn\'t encode if it doesn\'t need to', async () => {
        const mockedFetch = mock(async () => new Response())
        const client = treaty<typeof app>('', { fetcher: mockedFetch })

        await client.index.get({
            query: {
                hello: 'world' 
            }
        })

        expect(mockedFetch).toHaveBeenCalledWith(
            expect.stringMatching(/\?hello=world$/g), {
            headers: {},
            method: 'GET'
        })
    })

    it('encodes query parameters if it needs to', async () => {
        const mockedFetch = mock(async () => new Response())
        const client = treaty<typeof app>('', { fetcher: mockedFetch })

        await client.index.get({
            query: {
                ['1/2']: '1/2'
            }
        })

        expect(mockedFetch).toHaveBeenCalledWith(
            // %1F is the encoded value for /
            expect.stringMatching(/\?1%2F2=1%2F2$/g), {
            headers: {},
            method: 'GET'
        })
    })

    it('accepts and serializes several values for the same query parameter', async () => {
        const mockedFetch = mock(async () => new Response())
        const client = treaty<typeof app>('', { fetcher: mockedFetch })

        await client.index.get({
            query: {
                ['1/2']: ['1/2', '1 2']
            }
        })

        expect(mockedFetch).toHaveBeenCalledWith(
            // %2F is the encoded value for /
            // %20 is the encoded value for space
            expect.stringMatching(/\?1%2F2=1%2F2&1%2F2=1%202$/g), {
            headers: {},
            method: 'GET'
        })
    })
})
