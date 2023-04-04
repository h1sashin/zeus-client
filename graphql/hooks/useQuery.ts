import { useCallback, useEffect, useState } from 'react';
import { client } from '../client';
import { createError } from '../utils/createError';
import { GenericOperation, GraphQLTypes, InputType, ValueTypes } from '../zeus';

export const useQuery = <
    T extends ValueTypes[GenericOperation<M>],
    M extends 'query' | 'mutation' = 'query',
    R extends keyof ValueTypes = GenericOperation<M>,
    D extends InputType<GraphQLTypes[R], T> = InputType<GraphQLTypes[R], T>,
>(
    q: T,
) => {
    const [data, setData] = useState<D>();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error>();
    const [_refetch, setRefetch] = useState(false);

    const refetch = useCallback(() => setRefetch(prev => !prev), []);

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const d = (await client.query(q)) as unknown as D;
                setData(d);
            } catch (e) {
                setError(createError(e));
            }
            setLoading(false);
        })();
    }, [_refetch]);

    return { data, loading, error, refetch };
};
