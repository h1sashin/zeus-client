import { useCallback, useState } from 'react';
import { client } from '../client';
import { createError } from '../utils/createError';
import { $, GenericOperation, GraphQLTypes, InputType, ValueTypes } from '../zeus';

export const useMutation = <
    T extends ValueTypes[GenericOperation<M>],
    M extends 'query' | 'mutation' = 'mutation',
    R extends keyof ValueTypes = GenericOperation<M>,
    D extends InputType<GraphQLTypes[R], T> = InputType<GraphQLTypes[R], T>,
>(
    q: T,
): [() => Promise<D | void>, { data?: D; loading: boolean; error?: Error }] => {
    const [data, setData] = useState<D>();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error>();

    const mutate = useCallback(async () => {
        setLoading(true);
        try {
            const d = (await client.mutation(q)) as unknown as D;
            setData(d);
        } catch (e) {
            setError(createError(e));
        }
        setLoading(false);
    }, [q]);

    return [mutate, { data, loading, error } as const];
};
