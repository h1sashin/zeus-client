import { useCallback, useState } from 'react';
import { client } from '../client';
import { createError } from '../utils/createError';
import { GenericOperation, GraphQLTypes, InputType, ValueTypes } from '../zeus';

export const useLazyQuery = <
    T extends ValueTypes[GenericOperation<M>],
    M extends 'query' | 'mutation' = 'query',
    R extends keyof ValueTypes = GenericOperation<M>,
    D extends InputType<GraphQLTypes[R], T> = InputType<GraphQLTypes[R], T>,
>(
    q: T,
): [() => Promise<D | void>, { data?: D; loading: boolean; error?: Error; refetch: () => void }] => {
    const [data, setData] = useState<D>();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error>();
    const [_refetch, setRefetch] = useState(false);

    const query = useCallback(async () => {
        setLoading(true);
        try {
            const d = (await client.query(q)) as unknown as D;
            setData(d);
            return d;
        } catch (e) {
            setError(createError(e));
        }
        setLoading(false);
    }, [q]);

    const refetch = () => setRefetch(prev => !prev);

    return [query, { data, loading, error, refetch } as const];
};
