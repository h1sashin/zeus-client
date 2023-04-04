import { getToken } from './utils/tokenManager';
import { ScalarDefinition, Thunder, apiFetch as ZeusFetch, ValueTypes, GenericOperation, ZeusScalars } from './zeus';

export type RequestInitConfig = RequestInit | (() => Promise<RequestInit>) | (() => RequestInit);
export type GraphQLClientConfig = {
    uri: string;
    request?: RequestInitConfig;
    scalars?: ScalarDefinition;
};

export class GraphQLClient {
    private uri: string;
    private request?: RequestInitConfig;
    private scalars?: ScalarDefinition;
    constructor(config: GraphQLClientConfig) {
        this.uri = config.uri;
        this.request = config.request;
        this.scalars = config.scalars;
    }

    private async fetch<T extends 'query' | 'mutation'>(method: T) {
        const requestInit = typeof this.request === 'function' ? await this.request() : this.request;
        const apiFetch = ZeusFetch([this.uri, requestInit]);
        if (!apiFetch) throw new Error('No response from server');
        return Thunder(apiFetch)(method, this.scalars);
    }

    public async query<R extends ValueTypes[GenericOperation<T>], T extends 'mutation' | 'query' = 'query'>(q: R) {
        return (await this.fetch('query'))(q);
    }

    public async mutation<R extends ValueTypes[GenericOperation<T>], T extends 'mutation' | 'query' = 'mutation'>(
        q: R,
    ) {
        return (await this.fetch('mutation'))(q);
    }
}

export const client = new GraphQLClient({
    uri: process.env['NEXT_PUBLIC_BILLABEE'] || '',
    request: () => {
        const token = getToken();
        return { headers: { ...(token ? { Authorization: `${token}` } : {}), 'Content-Type': 'application/json' } };
    },
    scalars: ZeusScalars({
        Headers: {
            decode: (e: unknown) => e as Record<string, string>,
            encode: (e: unknown) => JSON.stringify(e as Record<string, string>),
        },
    }),
});
