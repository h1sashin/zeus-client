/* eslint-disable */

import { AllTypesProps, ReturnTypes, Ops } from './const';
export const HOST = "https://billabee-api.azurewebsites.net/graphql"


export const HEADERS = {}
export const apiSubscription = (options: chainOptions) => (query: string) => {
  try {
    const queryString = options[0] + '?query=' + encodeURIComponent(query);
    const wsString = queryString.replace('http', 'ws');
    const host = (options.length > 1 && options[1]?.websocket?.[0]) || wsString;
    const webSocketOptions = options[1]?.websocket || [host];
    const ws = new WebSocket(...webSocketOptions);
    return {
      ws,
      on: (e: (args: any) => void) => {
        ws.onmessage = (event: any) => {
          if (event.data) {
            const parsed = JSON.parse(event.data);
            const data = parsed.data;
            return e(data);
          }
        };
      },
      off: (e: (args: any) => void) => {
        ws.onclose = e;
      },
      error: (e: (args: any) => void) => {
        ws.onerror = e;
      },
      open: (e: () => void) => {
        ws.onopen = e;
      },
    };
  } catch {
    throw new Error('No websockets implemented');
  }
};
const handleFetchResponse = (response: Response): Promise<GraphQLResponse> => {
  if (!response.ok) {
    return new Promise((_, reject) => {
      response
        .text()
        .then((text) => {
          try {
            reject(JSON.parse(text));
          } catch (err) {
            reject(text);
          }
        })
        .catch(reject);
    });
  }
  return response.json();
};

export const apiFetch =
  (options: fetchOptions) =>
  (query: string, variables: Record<string, unknown> = {}) => {
    const fetchOptions = options[1] || {};
    if (fetchOptions.method && fetchOptions.method === 'GET') {
      return fetch(`${options[0]}?query=${encodeURIComponent(query)}`, fetchOptions)
        .then(handleFetchResponse)
        .then((response: GraphQLResponse) => {
          if (response.errors) {
            throw new GraphQLError(response);
          }
          return response.data;
        });
    }
    return fetch(`${options[0]}`, {
      body: JSON.stringify({ query, variables }),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      ...fetchOptions,
    })
      .then(handleFetchResponse)
      .then((response: GraphQLResponse) => {
        if (response.errors) {
          throw new GraphQLError(response);
        }
        return response.data;
      });
  };

export const InternalsBuildQuery = ({
  ops,
  props,
  returns,
  options,
  scalars,
}: {
  props: AllTypesPropsType;
  returns: ReturnTypesType;
  ops: Operations;
  options?: OperationOptions;
  scalars?: ScalarDefinition;
}) => {
  const ibb = (
    k: string,
    o: InputValueType | VType,
    p = '',
    root = true,
    vars: Array<{ name: string; graphQLType: string }> = [],
  ): string => {
    const keyForPath = purifyGraphQLKey(k);
    const newPath = [p, keyForPath].join(SEPARATOR);
    if (!o) {
      return '';
    }
    if (typeof o === 'boolean' || typeof o === 'number') {
      return k;
    }
    if (typeof o === 'string') {
      return `${k} ${o}`;
    }
    if (Array.isArray(o)) {
      const args = InternalArgsBuilt({
        props,
        returns,
        ops,
        scalars,
        vars,
      })(o[0], newPath);
      return `${ibb(args ? `${k}(${args})` : k, o[1], p, false, vars)}`;
    }
    if (k === '__alias') {
      return Object.entries(o)
        .map(([alias, objectUnderAlias]) => {
          if (typeof objectUnderAlias !== 'object' || Array.isArray(objectUnderAlias)) {
            throw new Error(
              'Invalid alias it should be __alias:{ YOUR_ALIAS_NAME: { OPERATION_NAME: { ...selectors }}}',
            );
          }
          const operationName = Object.keys(objectUnderAlias)[0];
          const operation = objectUnderAlias[operationName];
          return ibb(`${alias}:${operationName}`, operation, p, false, vars);
        })
        .join('\n');
    }
    const hasOperationName = root && options?.operationName ? ' ' + options.operationName : '';
    const keyForDirectives = o.__directives ?? '';
    const query = `{${Object.entries(o)
      .filter(([k]) => k !== '__directives')
      .map((e) => ibb(...e, [p, `field<>${keyForPath}`].join(SEPARATOR), false, vars))
      .join('\n')}}`;
    if (!root) {
      return `${k} ${keyForDirectives}${hasOperationName} ${query}`;
    }
    const varsString = vars.map((v) => `${v.name}: ${v.graphQLType}`).join(', ');
    return `${k} ${keyForDirectives}${hasOperationName}${varsString ? `(${varsString})` : ''} ${query}`;
  };
  return ibb;
};

export const Thunder =
  (fn: FetchFunction) =>
  <O extends keyof typeof Ops, SCLR extends ScalarDefinition, R extends keyof ValueTypes = GenericOperation<O>>(
    operation: O,
    graphqlOptions?: ThunderGraphQLOptions<SCLR>,
  ) =>
  <Z extends ValueTypes[R]>(o: Z | ValueTypes[R], ops?: OperationOptions & { variables?: Record<string, unknown> }) =>
    fn(
      Zeus(operation, o, {
        operationOptions: ops,
        scalars: graphqlOptions?.scalars,
      }),
      ops?.variables,
    ).then((data) => {
      if (graphqlOptions?.scalars) {
        return decodeScalarsInResponse({
          response: data,
          initialOp: operation,
          initialZeusQuery: o as VType,
          returns: ReturnTypes,
          scalars: graphqlOptions.scalars,
          ops: Ops,
        });
      }
      return data;
    }) as Promise<InputType<GraphQLTypes[R], Z, SCLR>>;

export const Chain = (...options: chainOptions) => Thunder(apiFetch(options));

export const SubscriptionThunder =
  (fn: SubscriptionFunction) =>
  <O extends keyof typeof Ops, SCLR extends ScalarDefinition, R extends keyof ValueTypes = GenericOperation<O>>(
    operation: O,
    graphqlOptions?: ThunderGraphQLOptions<SCLR>,
  ) =>
  <Z extends ValueTypes[R]>(o: Z | ValueTypes[R], ops?: OperationOptions & { variables?: ExtractVariables<Z> }) => {
    const returnedFunction = fn(
      Zeus(operation, o, {
        operationOptions: ops,
        scalars: graphqlOptions?.scalars,
      }),
    ) as SubscriptionToGraphQL<Z, GraphQLTypes[R], SCLR>;
    if (returnedFunction?.on && graphqlOptions?.scalars) {
      const wrapped = returnedFunction.on;
      returnedFunction.on = (fnToCall: (args: InputType<GraphQLTypes[R], Z, SCLR>) => void) =>
        wrapped((data: InputType<GraphQLTypes[R], Z, SCLR>) => {
          if (graphqlOptions?.scalars) {
            return fnToCall(
              decodeScalarsInResponse({
                response: data,
                initialOp: operation,
                initialZeusQuery: o as VType,
                returns: ReturnTypes,
                scalars: graphqlOptions.scalars,
                ops: Ops,
              }),
            );
          }
          return fnToCall(data);
        });
    }
    return returnedFunction;
  };

export const Subscription = (...options: chainOptions) => SubscriptionThunder(apiSubscription(options));
export const Zeus = <
  Z extends ValueTypes[R],
  O extends keyof typeof Ops,
  R extends keyof ValueTypes = GenericOperation<O>,
>(
  operation: O,
  o: Z | ValueTypes[R],
  ops?: {
    operationOptions?: OperationOptions;
    scalars?: ScalarDefinition;
  },
) =>
  InternalsBuildQuery({
    props: AllTypesProps,
    returns: ReturnTypes,
    ops: Ops,
    options: ops?.operationOptions,
    scalars: ops?.scalars,
  })(operation, o as VType);

export const ZeusSelect = <T>() => ((t: unknown) => t) as SelectionFunction<T>;

export const Selector = <T extends keyof ValueTypes>(key: T) => key && ZeusSelect<ValueTypes[T]>();

export const TypeFromSelector = <T extends keyof ValueTypes>(key: T) => key && ZeusSelect<ValueTypes[T]>();
export const Gql = Chain(HOST, {
  headers: {
    'Content-Type': 'application/json',
    ...HEADERS,
  },
});

export const ZeusScalars = ZeusSelect<ScalarCoders>();

export const decodeScalarsInResponse = <O extends Operations>({
  response,
  scalars,
  returns,
  ops,
  initialZeusQuery,
  initialOp,
}: {
  ops: O;
  response: any;
  returns: ReturnTypesType;
  scalars?: Record<string, ScalarResolver | undefined>;
  initialOp: keyof O;
  initialZeusQuery: InputValueType | VType;
}) => {
  if (!scalars) {
    return response;
  }
  const builder = PrepareScalarPaths({
    ops,
    returns,
  });

  const scalarPaths = builder(initialOp as string, ops[initialOp], initialZeusQuery);
  if (scalarPaths) {
    const r = traverseResponse({ scalarPaths, resolvers: scalars })(initialOp as string, response, [ops[initialOp]]);
    return r;
  }
  return response;
};

export const traverseResponse = ({
  resolvers,
  scalarPaths,
}: {
  scalarPaths: { [x: string]: `scalar.${string}` };
  resolvers: {
    [x: string]: ScalarResolver | undefined;
  };
}) => {
  const ibb = (k: string, o: InputValueType | VType, p: string[] = []): unknown => {
    if (Array.isArray(o)) {
      return o.map((eachO) => ibb(k, eachO, p));
    }
    if (o == null) {
      return o;
    }
    const scalarPathString = p.join(SEPARATOR);
    const currentScalarString = scalarPaths[scalarPathString];
    if (currentScalarString) {
      const currentDecoder = resolvers[currentScalarString.split('.')[1]]?.decode;
      if (currentDecoder) {
        return currentDecoder(o);
      }
    }
    if (typeof o === 'boolean' || typeof o === 'number' || typeof o === 'string' || !o) {
      return o;
    }
    const entries = Object.entries(o).map(([k, v]) => [k, ibb(k, v, [...p, purifyGraphQLKey(k)])] as const);
    const objectFromEntries = entries.reduce<Record<string, unknown>>((a, [k, v]) => {
      a[k] = v;
      return a;
    }, {});
    return objectFromEntries;
  };
  return ibb;
};

export type AllTypesPropsType = {
  [x: string]:
    | undefined
    | `scalar.${string}`
    | 'enum'
    | {
        [x: string]:
          | undefined
          | string
          | {
              [x: string]: string | undefined;
            };
      };
};

export type ReturnTypesType = {
  [x: string]:
    | {
        [x: string]: string | undefined;
      }
    | `scalar.${string}`
    | undefined;
};
export type InputValueType = {
  [x: string]: undefined | boolean | string | number | [any, undefined | boolean | InputValueType] | InputValueType;
};
export type VType =
  | undefined
  | boolean
  | string
  | number
  | [any, undefined | boolean | InputValueType]
  | InputValueType;

export type PlainType = boolean | number | string | null | undefined;
export type ZeusArgsType =
  | PlainType
  | {
      [x: string]: ZeusArgsType;
    }
  | Array<ZeusArgsType>;

export type Operations = Record<string, string>;

export type VariableDefinition = {
  [x: string]: unknown;
};

export const SEPARATOR = '|';

export type fetchOptions = Parameters<typeof fetch>;
type websocketOptions = typeof WebSocket extends new (...args: infer R) => WebSocket ? R : never;
export type chainOptions = [fetchOptions[0], fetchOptions[1] & { websocket?: websocketOptions }] | [fetchOptions[0]];
export type FetchFunction = (query: string, variables?: Record<string, unknown>) => Promise<any>;
export type SubscriptionFunction = (query: string) => any;
type NotUndefined<T> = T extends undefined ? never : T;
export type ResolverType<F> = NotUndefined<F extends [infer ARGS, any] ? ARGS : undefined>;

export type OperationOptions = {
  operationName?: string;
};

export type ScalarCoder = Record<string, (s: unknown) => string>;

export interface GraphQLResponse {
  data?: Record<string, any>;
  errors?: Array<{
    message: string;
  }>;
}
export class GraphQLError extends Error {
  constructor(public response: GraphQLResponse) {
    super('');
    console.error(response);
  }
  toString() {
    return 'GraphQL Response Error';
  }
}
export type GenericOperation<O> = O extends keyof typeof Ops ? typeof Ops[O] : never;
export type ThunderGraphQLOptions<SCLR extends ScalarDefinition> = {
  scalars?: SCLR | ScalarCoders;
};

const ExtractScalar = (mappedParts: string[], returns: ReturnTypesType): `scalar.${string}` | undefined => {
  if (mappedParts.length === 0) {
    return;
  }
  const oKey = mappedParts[0];
  const returnP1 = returns[oKey];
  if (typeof returnP1 === 'object') {
    const returnP2 = returnP1[mappedParts[1]];
    if (returnP2) {
      return ExtractScalar([returnP2, ...mappedParts.slice(2)], returns);
    }
    return undefined;
  }
  return returnP1 as `scalar.${string}` | undefined;
};

export const PrepareScalarPaths = ({ ops, returns }: { returns: ReturnTypesType; ops: Operations }) => {
  const ibb = (
    k: string,
    originalKey: string,
    o: InputValueType | VType,
    p: string[] = [],
    pOriginals: string[] = [],
    root = true,
  ): { [x: string]: `scalar.${string}` } | undefined => {
    if (!o) {
      return;
    }
    if (typeof o === 'boolean' || typeof o === 'number' || typeof o === 'string') {
      const extractionArray = [...pOriginals, originalKey];
      const isScalar = ExtractScalar(extractionArray, returns);
      if (isScalar?.startsWith('scalar')) {
        const partOfTree = {
          [[...p, k].join(SEPARATOR)]: isScalar,
        };
        return partOfTree;
      }
      return {};
    }
    if (Array.isArray(o)) {
      return ibb(k, k, o[1], p, pOriginals, false);
    }
    if (k === '__alias') {
      return Object.entries(o)
        .map(([alias, objectUnderAlias]) => {
          if (typeof objectUnderAlias !== 'object' || Array.isArray(objectUnderAlias)) {
            throw new Error(
              'Invalid alias it should be __alias:{ YOUR_ALIAS_NAME: { OPERATION_NAME: { ...selectors }}}',
            );
          }
          const operationName = Object.keys(objectUnderAlias)[0];
          const operation = objectUnderAlias[operationName];
          return ibb(alias, operationName, operation, p, pOriginals, false);
        })
        .reduce((a, b) => ({
          ...a,
          ...b,
        }));
    }
    const keyName = root ? ops[k] : k;
    return Object.entries(o)
      .filter(([k]) => k !== '__directives')
      .map(([k, v]) => {
        // Inline fragments shouldn't be added to the path as they aren't a field
        const isInlineFragment = originalKey.match(/^...\s*on/) != null;
        return ibb(
          k,
          k,
          v,
          isInlineFragment ? p : [...p, purifyGraphQLKey(keyName || k)],
          isInlineFragment ? pOriginals : [...pOriginals, purifyGraphQLKey(originalKey)],
          false,
        );
      })
      .reduce((a, b) => ({
        ...a,
        ...b,
      }));
  };
  return ibb;
};

export const purifyGraphQLKey = (k: string) => k.replace(/\([^)]*\)/g, '').replace(/^[^:]*\:/g, '');

const mapPart = (p: string) => {
  const [isArg, isField] = p.split('<>');
  if (isField) {
    return {
      v: isField,
      __type: 'field',
    } as const;
  }
  return {
    v: isArg,
    __type: 'arg',
  } as const;
};

type Part = ReturnType<typeof mapPart>;

export const ResolveFromPath = (props: AllTypesPropsType, returns: ReturnTypesType, ops: Operations) => {
  const ResolvePropsType = (mappedParts: Part[]) => {
    const oKey = ops[mappedParts[0].v];
    const propsP1 = oKey ? props[oKey] : props[mappedParts[0].v];
    if (propsP1 === 'enum' && mappedParts.length === 1) {
      return 'enum';
    }
    if (typeof propsP1 === 'string' && propsP1.startsWith('scalar.') && mappedParts.length === 1) {
      return propsP1;
    }
    if (typeof propsP1 === 'object') {
      if (mappedParts.length < 2) {
        return 'not';
      }
      const propsP2 = propsP1[mappedParts[1].v];
      if (typeof propsP2 === 'string') {
        return rpp(
          `${propsP2}${SEPARATOR}${mappedParts
            .slice(2)
            .map((mp) => mp.v)
            .join(SEPARATOR)}`,
        );
      }
      if (typeof propsP2 === 'object') {
        if (mappedParts.length < 3) {
          return 'not';
        }
        const propsP3 = propsP2[mappedParts[2].v];
        if (propsP3 && mappedParts[2].__type === 'arg') {
          return rpp(
            `${propsP3}${SEPARATOR}${mappedParts
              .slice(3)
              .map((mp) => mp.v)
              .join(SEPARATOR)}`,
          );
        }
      }
    }
  };
  const ResolveReturnType = (mappedParts: Part[]) => {
    if (mappedParts.length === 0) {
      return 'not';
    }
    const oKey = ops[mappedParts[0].v];
    const returnP1 = oKey ? returns[oKey] : returns[mappedParts[0].v];
    if (typeof returnP1 === 'object') {
      if (mappedParts.length < 2) return 'not';
      const returnP2 = returnP1[mappedParts[1].v];
      if (returnP2) {
        return rpp(
          `${returnP2}${SEPARATOR}${mappedParts
            .slice(2)
            .map((mp) => mp.v)
            .join(SEPARATOR)}`,
        );
      }
    }
  };
  const rpp = (path: string): 'enum' | 'not' | `scalar.${string}` => {
    const parts = path.split(SEPARATOR).filter((l) => l.length > 0);
    const mappedParts = parts.map(mapPart);
    const propsP1 = ResolvePropsType(mappedParts);
    if (propsP1) {
      return propsP1;
    }
    const returnP1 = ResolveReturnType(mappedParts);
    if (returnP1) {
      return returnP1;
    }
    return 'not';
  };
  return rpp;
};

export const InternalArgsBuilt = ({
  props,
  ops,
  returns,
  scalars,
  vars,
}: {
  props: AllTypesPropsType;
  returns: ReturnTypesType;
  ops: Operations;
  scalars?: ScalarDefinition;
  vars: Array<{ name: string; graphQLType: string }>;
}) => {
  const arb = (a: ZeusArgsType, p = '', root = true): string => {
    if (typeof a === 'string') {
      if (a.startsWith(START_VAR_NAME)) {
        const [varName, graphQLType] = a.replace(START_VAR_NAME, '$').split(GRAPHQL_TYPE_SEPARATOR);
        const v = vars.find((v) => v.name === varName);
        if (!v) {
          vars.push({
            name: varName,
            graphQLType,
          });
        } else {
          if (v.graphQLType !== graphQLType) {
            throw new Error(
              `Invalid variable exists with two different GraphQL Types, "${v.graphQLType}" and ${graphQLType}`,
            );
          }
        }
        return varName;
      }
    }
    const checkType = ResolveFromPath(props, returns, ops)(p);
    if (checkType.startsWith('scalar.')) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const [_, ...splittedScalar] = checkType.split('.');
      const scalarKey = splittedScalar.join('.');
      return (scalars?.[scalarKey]?.encode?.(a) as string) || JSON.stringify(a);
    }
    if (Array.isArray(a)) {
      return `[${a.map((arr) => arb(arr, p, false)).join(', ')}]`;
    }
    if (typeof a === 'string') {
      if (checkType === 'enum') {
        return a;
      }
      return `${JSON.stringify(a)}`;
    }
    if (typeof a === 'object') {
      if (a === null) {
        return `null`;
      }
      const returnedObjectString = Object.entries(a)
        .filter(([, v]) => typeof v !== 'undefined')
        .map(([k, v]) => `${k}: ${arb(v, [p, k].join(SEPARATOR), false)}`)
        .join(',\n');
      if (!root) {
        return `{${returnedObjectString}}`;
      }
      return returnedObjectString;
    }
    return `${a}`;
  };
  return arb;
};

export const resolverFor = <X, T extends keyof ResolverInputTypes, Z extends keyof ResolverInputTypes[T]>(
  type: T,
  field: Z,
  fn: (
    args: Required<ResolverInputTypes[T]>[Z] extends [infer Input, any] ? Input : any,
    source: any,
  ) => Z extends keyof ModelTypes[T] ? ModelTypes[T][Z] | Promise<ModelTypes[T][Z]> | X : any,
) => fn as (args?: any, source?: any) => any;

export type UnwrapPromise<T> = T extends Promise<infer R> ? R : T;
export type ZeusState<T extends (...args: any[]) => Promise<any>> = NonNullable<UnwrapPromise<ReturnType<T>>>;
export type ZeusHook<
  T extends (...args: any[]) => Record<string, (...args: any[]) => Promise<any>>,
  N extends keyof ReturnType<T>,
> = ZeusState<ReturnType<T>[N]>;

export type WithTypeNameValue<T> = T & {
  __typename?: boolean;
  __directives?: string;
};
export type AliasType<T> = WithTypeNameValue<T> & {
  __alias?: Record<string, WithTypeNameValue<T>>;
};
type DeepAnify<T> = {
  [P in keyof T]?: any;
};
type IsPayLoad<T> = T extends [any, infer PayLoad] ? PayLoad : T;
export type ScalarDefinition = Record<string, ScalarResolver>;

type IsScalar<S, SCLR extends ScalarDefinition> = S extends 'scalar' & { name: infer T }
  ? T extends keyof SCLR
    ? SCLR[T]['decode'] extends (s: unknown) => unknown
      ? ReturnType<SCLR[T]['decode']>
      : unknown
    : unknown
  : S;
type IsArray<T, U, SCLR extends ScalarDefinition> = T extends Array<infer R>
  ? InputType<R, U, SCLR>[]
  : InputType<T, U, SCLR>;
type FlattenArray<T> = T extends Array<infer R> ? R : T;
type BaseZeusResolver = boolean | 1 | string | Variable<any, string>;

type IsInterfaced<SRC extends DeepAnify<DST>, DST, SCLR extends ScalarDefinition> = FlattenArray<SRC> extends
  | ZEUS_INTERFACES
  | ZEUS_UNIONS
  ? {
      [P in keyof SRC]: SRC[P] extends '__union' & infer R
        ? P extends keyof DST
          ? IsArray<R, '__typename' extends keyof DST ? DST[P] & { __typename: true } : DST[P], SCLR>
          : IsArray<R, '__typename' extends keyof DST ? { __typename: true } : never, SCLR>
        : never;
    }[keyof SRC] & {
      [P in keyof Omit<
        Pick<
          SRC,
          {
            [P in keyof DST]: SRC[P] extends '__union' & infer R ? never : P;
          }[keyof DST]
        >,
        '__typename'
      >]: IsPayLoad<DST[P]> extends BaseZeusResolver ? IsScalar<SRC[P], SCLR> : IsArray<SRC[P], DST[P], SCLR>;
    }
  : {
      [P in keyof Pick<SRC, keyof DST>]: IsPayLoad<DST[P]> extends BaseZeusResolver
        ? IsScalar<SRC[P], SCLR>
        : IsArray<SRC[P], DST[P], SCLR>;
    };

export type MapType<SRC, DST, SCLR extends ScalarDefinition> = SRC extends DeepAnify<DST>
  ? IsInterfaced<SRC, DST, SCLR>
  : never;
// eslint-disable-next-line @typescript-eslint/ban-types
export type InputType<SRC, DST, SCLR extends ScalarDefinition = {}> = IsPayLoad<DST> extends { __alias: infer R }
  ? {
      [P in keyof R]: MapType<SRC, R[P], SCLR>[keyof MapType<SRC, R[P], SCLR>];
    } & MapType<SRC, Omit<IsPayLoad<DST>, '__alias'>, SCLR>
  : MapType<SRC, IsPayLoad<DST>, SCLR>;
export type SubscriptionToGraphQL<Z, T, SCLR extends ScalarDefinition> = {
  ws: WebSocket;
  on: (fn: (args: InputType<T, Z, SCLR>) => void) => void;
  off: (fn: (e: { data?: InputType<T, Z, SCLR>; code?: number; reason?: string; message?: string }) => void) => void;
  error: (fn: (e: { data?: InputType<T, Z, SCLR>; errors?: string[] }) => void) => void;
  open: () => void;
};

// eslint-disable-next-line @typescript-eslint/ban-types
export type FromSelector<SELECTOR, NAME extends keyof GraphQLTypes, SCLR extends ScalarDefinition = {}> = InputType<
  GraphQLTypes[NAME],
  SELECTOR,
  SCLR
>;

export type ScalarResolver = {
  encode?: (s: unknown) => string;
  decode?: (s: unknown) => unknown;
};

export type SelectionFunction<V> = <T>(t: T | V) => T;

type BuiltInVariableTypes = {
  ['String']: string;
  ['Int']: number;
  ['Float']: number;
  ['ID']: unknown;
  ['Boolean']: boolean;
};
type AllVariableTypes = keyof BuiltInVariableTypes | keyof ZEUS_VARIABLES;
type VariableRequired<T extends string> = `${T}!` | T | `[${T}]` | `[${T}]!` | `[${T}!]` | `[${T}!]!`;
type VR<T extends string> = VariableRequired<VariableRequired<T>>;

export type GraphQLVariableType = VR<AllVariableTypes>;

type ExtractVariableTypeString<T extends string> = T extends VR<infer R1>
  ? R1 extends VR<infer R2>
    ? R2 extends VR<infer R3>
      ? R3 extends VR<infer R4>
        ? R4 extends VR<infer R5>
          ? R5
          : R4
        : R3
      : R2
    : R1
  : T;

type DecomposeType<T, Type> = T extends `[${infer R}]`
  ? Array<DecomposeType<R, Type>> | undefined
  : T extends `${infer R}!`
  ? NonNullable<DecomposeType<R, Type>>
  : Type | undefined;

type ExtractTypeFromGraphQLType<T extends string> = T extends keyof ZEUS_VARIABLES
  ? ZEUS_VARIABLES[T]
  : T extends keyof BuiltInVariableTypes
  ? BuiltInVariableTypes[T]
  : any;

export type GetVariableType<T extends string> = DecomposeType<
  T,
  ExtractTypeFromGraphQLType<ExtractVariableTypeString<T>>
>;

type UndefinedKeys<T> = {
  [K in keyof T]-?: T[K] extends NonNullable<T[K]> ? never : K;
}[keyof T];

type WithNullableKeys<T> = Pick<T, UndefinedKeys<T>>;
type WithNonNullableKeys<T> = Omit<T, UndefinedKeys<T>>;

type OptionalKeys<T> = {
  [P in keyof T]?: T[P];
};

export type WithOptionalNullables<T> = OptionalKeys<WithNullableKeys<T>> & WithNonNullableKeys<T>;

export type Variable<T extends GraphQLVariableType, Name extends string> = {
  ' __zeus_name': Name;
  ' __zeus_type': T;
};

export type ExtractVariables<Query> = Query extends Variable<infer VType, infer VName>
  ? { [key in VName]: GetVariableType<VType> }
  : Query extends [infer Inputs, infer Outputs]
  ? ExtractVariables<Inputs> & ExtractVariables<Outputs>
  : Query extends string | number | boolean
  ? // eslint-disable-next-line @typescript-eslint/ban-types
    {}
  : UnionToIntersection<{ [K in keyof Query]: WithOptionalNullables<ExtractVariables<Query[K]>> }[keyof Query]>;

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;

export const START_VAR_NAME = `$ZEUS_VAR`;
export const GRAPHQL_TYPE_SEPARATOR = `__$GRAPHQL__`;

export const $ = <Type extends GraphQLVariableType, Name extends string>(name: Name, graphqlType: Type) => {
  return (START_VAR_NAME + name + GRAPHQL_TYPE_SEPARATOR + graphqlType) as unknown as Variable<Type, Name>;
};
type ZEUS_INTERFACES = GraphQLTypes["Node"] | GraphQLTypes["Billing"] | GraphQLTypes["Archivable"]
export type ScalarCoders = {
	DateTime?: ScalarResolver;
	Time?: ScalarResolver;
	Date?: ScalarResolver;
}
type ZEUS_UNIONS = never

export type ValueTypes = {
    ["LoginInput"]: {
	loginType: ValueTypes["LoginType"] | Variable<any, string>,
	code?: string | undefined | null | Variable<any, string>,
	username?: string | undefined | null | Variable<any, string>,
	password?: string | undefined | null | Variable<any, string>
};
	["DateTime"]:unknown;
	/** Time log of a user time */
["TimeLog"]: AliasType<{
	_id?:boolean | `@${string}`,
	account?:ValueTypes["Account"],
	archivedAt?:boolean | `@${string}`,
	billable?:ValueTypes["TimeLogBilled"],
	createdAt?:boolean | `@${string}`,
	date?:boolean | `@${string}`,
	description?:boolean | `@${string}`,
	/** How many minutes from the date are logged */
	minutes?:boolean | `@${string}`,
	project?:ValueTypes["Project"],
	start?:boolean | `@${string}`,
	updatedAt?:boolean | `@${string}`,
	user?:ValueTypes["User"],
		__typename?: boolean | `@${string}`
}>;
	["CreateClient"]: {
	name: string | Variable<any, string>
};
	["ChangePasswordInput"]: {
	newPassword: string | Variable<any, string>,
	username: string | Variable<any, string>,
	forgotToken?: string | undefined | null | Variable<any, string>,
	oldPassword?: string | undefined | null | Variable<any, string>
};
	/** Admin object with a name to identify administrator of all objects. Admin is an primary owner of the account */
["Account"]: AliasType<{
	_id?:boolean | `@${string}`,
	customerId?:boolean | `@${string}`,
	name?:boolean | `@${string}`,
	role?:boolean | `@${string}`,
	username?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["TimeLogBilled"]: AliasType<{
	amountBilled?:boolean | `@${string}`,
	currency?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["UserOps"]: AliasType<{
	addAdmin?:boolean | `@${string}`,
createVacation?: [{	vacation: ValueTypes["CreateVacation"] | Variable<any, string>},boolean | `@${string}`],
	delAdmin?:boolean | `@${string}`,
deleteVacation?: [{	_id: string | Variable<any, string>},boolean | `@${string}`],
	remove?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["SocialKind"]:SocialKind;
	["UpgradeAdminAccountInput"]: {
	cancelled_url: string | Variable<any, string>,
	productId: string | Variable<any, string>,
	success_url: string | Variable<any, string>
};
	["Client"]: AliasType<{
	_id?:boolean | `@${string}`,
	account?:ValueTypes["Account"],
	archivedAt?:boolean | `@${string}`,
	createdAt?:boolean | `@${string}`,
	name?:boolean | `@${string}`,
	projects?:ValueTypes["Project"],
	updatedAt?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["CreateLog"]: {
	project: string | Variable<any, string>,
	description?: string | undefined | null | Variable<any, string>,
	start?: ValueTypes["Time"] | undefined | null | Variable<any, string>,
	/** How many minutes from the date are logged */
	minutes: number | Variable<any, string>,
	date: ValueTypes["Date"] | Variable<any, string>
};
	["HourlyBillingOps"]: AliasType<{
	remove?:boolean | `@${string}`,
update?: [{	billingUpdate?: ValueTypes["UpdateHourlyBilling"] | undefined | null | Variable<any, string>},boolean | `@${string}`],
		__typename?: boolean | `@${string}`
}>;
	["UpdateFixedBilling"]: {
	value?: number | undefined | null | Variable<any, string>,
	currency?: ValueTypes["Currency"] | undefined | null | Variable<any, string>,
	project?: string | undefined | null | Variable<any, string>
};
	["RegisterAccount"]: {
	password: string | Variable<any, string>,
	/** to jest email */
	username: string | Variable<any, string>,
	/** to nazwa firmy */
	name: string | Variable<any, string>,
	/** to unikalna nazwa usera */
	nickname: string | Variable<any, string>
};
	/** 12:00 */
["Time"]:unknown;
	["InviteToken"]: AliasType<{
	domain?:boolean | `@${string}`,
	/** format dd/mm/rrrr */
	expires?:boolean | `@${string}`,
	owner?:boolean | `@${string}`,
	/** Admin object with a name to identify administrator of all objects. Admin is an primary owner of the account */
	token?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["UpdateHourlyBilling"]: {
	value?: number | undefined | null | Variable<any, string>,
	currency?: ValueTypes["Currency"] | undefined | null | Variable<any, string>,
	project?: string | undefined | null | Variable<any, string>,
	user?: string | undefined | null | Variable<any, string>
};
	/** Queries for admin account */
["AdminQuery"]: AliasType<{
	/** Admin object with a name to identify administrator of all objects. Admin is an primary owner of the account */
	account?:ValueTypes["Account"],
billingById?: [{	_id: string | Variable<any, string>},ValueTypes["Billing"]],
	billings?:ValueTypes["Billing"],
clientById?: [{	_id: string | Variable<any, string>},ValueTypes["Client"]],
	clients?:ValueTypes["Client"],
	getStripeProducts?:ValueTypes["StripeProduct"],
logs?: [{	dateFilter: ValueTypes["DateFilter"] | Variable<any, string>,	adminFilter?: ValueTypes["AdminFilter"] | undefined | null | Variable<any, string>},ValueTypes["TimeLog"]],
projectById?: [{	_id: string | Variable<any, string>},ValueTypes["Project"]],
	projects?:ValueTypes["Project"],
	tokens?:ValueTypes["InviteToken"],
userById?: [{	_id: string | Variable<any, string>},ValueTypes["User"]],
	/** User of an admin account who logs time */
	users?:ValueTypes["User"],
vacations?: [{	date?: ValueTypes["DateFilter"] | undefined | null | Variable<any, string>},ValueTypes["Vacation"]],
		__typename?: boolean | `@${string}`
}>;
	["StripeProduct"]: AliasType<{
	currency?:boolean | `@${string}`,
	description?:boolean | `@${string}`,
	interval?:boolean | `@${string}`,
	interval_count?:boolean | `@${string}`,
	name?:boolean | `@${string}`,
	price_id?:boolean | `@${string}`,
	price_value?:boolean | `@${string}`,
	product_id?:boolean | `@${string}`,
	trial_period_days?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["FixedBilling"]: AliasType<{
	_id?:boolean | `@${string}`,
	/** Admin object with a name to identify administrator of all objects. Admin is an primary owner of the account */
	account?:ValueTypes["Account"],
	createdAt?:boolean | `@${string}`,
	currency?:boolean | `@${string}`,
	project?:ValueTypes["Project"],
	updatedAt?:boolean | `@${string}`,
	value?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["UserQuery"]: AliasType<{
	clients?:ValueTypes["Client"],
logs?: [{	dateFilter: ValueTypes["DateFilter"] | Variable<any, string>},ValueTypes["TimeLog"]],
	/** User of an admin account who logs time */
	me?:ValueTypes["User"],
	projects?:ValueTypes["Project"],
vacations?: [{	date?: ValueTypes["DateFilter"] | undefined | null | Variable<any, string>},ValueTypes["Vacation"]],
		__typename?: boolean | `@${string}`
}>;
	["Project"]: AliasType<{
	_id?:boolean | `@${string}`,
	account?:ValueTypes["Account"],
	archivedAt?:boolean | `@${string}`,
	client?:ValueTypes["Client"],
	createdAt?:boolean | `@${string}`,
	name?:boolean | `@${string}`,
	updatedAt?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** Mutations for admin account */
["AdminMutation"]: AliasType<{
clientOps?: [{	id: string | Variable<any, string>},ValueTypes["ClientOps"]],
createClient?: [{	createClient: ValueTypes["CreateClient"] | Variable<any, string>},boolean | `@${string}`],
createFixedBilling?: [{	billing: ValueTypes["CreateFixedBilling"] | Variable<any, string>},boolean | `@${string}`],
createHourlyBilling?: [{	billing: ValueTypes["CreateHourlyBilling"] | Variable<any, string>},boolean | `@${string}`],
createProject?: [{	createProject: ValueTypes["CreateProject"] | Variable<any, string>},boolean | `@${string}`],
deleteInviteToken?: [{	token: string | Variable<any, string>},boolean | `@${string}`],
fixedBillingOps?: [{	id: string | Variable<any, string>},ValueTypes["FixedBillingOps"]],
generateBillingPortal?: [{	returnUrl: string | Variable<any, string>},boolean | `@${string}`],
generateCheckoutSession?: [{	success_url: string | Variable<any, string>,	cancel_url: string | Variable<any, string>,	productIds: Array<string> | Variable<any, string>},boolean | `@${string}`],
generateInviteToken?: [{	/** string format dd/mm/rrrr */
	tokenOptions: ValueTypes["InviteTokenInput"] | Variable<any, string>},boolean | `@${string}`],
hourlyBillingOps?: [{	id: string | Variable<any, string>},ValueTypes["HourlyBillingOps"]],
projectOps?: [{	id: string | Variable<any, string>},ValueTypes["ProjectOps"]],
removeUserFromTeam?: [{	username: string | Variable<any, string>},boolean | `@${string}`],
upgradeAccount?: [{	upgradeInput: ValueTypes["UpgradeAdminAccountInput"] | Variable<any, string>},boolean | `@${string}`],
userOps?: [{	id: string | Variable<any, string>},ValueTypes["UserOps"]],
		__typename?: boolean | `@${string}`
}>;
	["InviteTokenInput"]: {
	expires?: ValueTypes["DateTime"] | undefined | null | Variable<any, string>,
	domain?: string | undefined | null | Variable<any, string>
};
	["PublicQuery"]: AliasType<{
	getAppleOAuthLink?:boolean | `@${string}`,
getGithubOAuthLink?: [{	scopes: Array<string | undefined | null> | Variable<any, string>},boolean | `@${string}`],
	getGoogleOAuthLink?:boolean | `@${string}`,
login?: [{	user: ValueTypes["LoginInput"] | Variable<any, string>},boolean | `@${string}`],
requestForForgotPassword?: [{	username: string | Variable<any, string>},boolean | `@${string}`],
		__typename?: boolean | `@${string}`
}>;
	/** # Roles
- Employee doesn't have role
- Owner is the person who created the account
- Admin is the person given admin rights by owner */
["Role"]:Role;
	/** string format "rrrr-mm-dd" */
["Date"]:unknown;
	["CreateVacation"]: {
	date: string | Variable<any, string>
};
	["UpdateUserAccount"]: {
	username?: string | undefined | null | Variable<any, string>,
	password?: string | undefined | null | Variable<any, string>,
	nickname?: string | undefined | null | Variable<any, string>
};
	["ClientOps"]: AliasType<{
	archive?:boolean | `@${string}`,
	remove?:boolean | `@${string}`,
	unArchive?:boolean | `@${string}`,
update?: [{	clientUpdate?: ValueTypes["ClientUpdate"] | undefined | null | Variable<any, string>},boolean | `@${string}`],
		__typename?: boolean | `@${string}`
}>;
	["VerifyEmailInput"]: {
	username: string | Variable<any, string>,
	token: string | Variable<any, string>
};
	["HourlyBilling"]: AliasType<{
	_id?:boolean | `@${string}`,
	/** Admin object with a name to identify administrator of all objects. Admin is an primary owner of the account */
	account?:ValueTypes["Account"],
	createdAt?:boolean | `@${string}`,
	currency?:boolean | `@${string}`,
	project?:ValueTypes["Project"],
	updatedAt?:boolean | `@${string}`,
	/** User of an admin account who logs time */
	user?:ValueTypes["User"],
	value?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["Node"]:AliasType<{
		updatedAt?:boolean | `@${string}`,
	_id?:boolean | `@${string}`,
	createdAt?:boolean | `@${string}`;
		['...on TimeLog']?: Omit<ValueTypes["TimeLog"],keyof ValueTypes["Node"]>;
		['...on Client']?: Omit<ValueTypes["Client"],keyof ValueTypes["Node"]>;
		['...on FixedBilling']?: Omit<ValueTypes["FixedBilling"],keyof ValueTypes["Node"]>;
		['...on Project']?: Omit<ValueTypes["Project"],keyof ValueTypes["Node"]>;
		['...on HourlyBilling']?: Omit<ValueTypes["HourlyBilling"],keyof ValueTypes["Node"]>;
		__typename?: boolean | `@${string}`
}>;
	/** User of an admin account who logs time */
["User"]: AliasType<{
	_id?:boolean | `@${string}`,
	/** Every user belongs to an admin account. We expose admin even it exists for scoping and db purposes */
	account?:ValueTypes["Account"],
	/** to unikalna nazwa usera */
	nickname?:boolean | `@${string}`,
	role?:boolean | `@${string}`,
	/** to jest email */
	username?:boolean | `@${string}`,
	vacations?:ValueTypes["Vacation"],
		__typename?: boolean | `@${string}`
}>;
	["Currency"]:Currency;
	["Mutation"]: AliasType<{
	admin?:ValueTypes["AdminMutation"],
	publicMutation?:ValueTypes["PublicMutation"],
	user?:ValueTypes["UserMutation"],
	/** entry point for Weebhooks. */
	webhook?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["FixedBillingOps"]: AliasType<{
	remove?:boolean | `@${string}`,
update?: [{	billingUpdate?: ValueTypes["UpdateFixedBilling"] | undefined | null | Variable<any, string>},boolean | `@${string}`],
		__typename?: boolean | `@${string}`
}>;
	["DateFilter"]: {
	from: ValueTypes["Date"] | Variable<any, string>,
	to?: ValueTypes["Date"] | undefined | null | Variable<any, string>
};
	["AdminFilter"]: {
	user_ids?: Array<string> | undefined | null | Variable<any, string>,
	client_ids?: Array<string> | undefined | null | Variable<any, string>,
	project_ids?: Array<string> | undefined | null | Variable<any, string>,
	asCurrency?: ValueTypes["Currency"] | undefined | null | Variable<any, string>
};
	["CreateProject"]: {
	client: string | Variable<any, string>,
	name: string | Variable<any, string>
};
	["Vacation"]: AliasType<{
	_id?:boolean | `@${string}`,
	account?:ValueTypes["Account"],
	administrable?:boolean | `@${string}`,
	createdAt?:boolean | `@${string}`,
	date?:boolean | `@${string}`,
	updatedAt?:boolean | `@${string}`,
	user?:ValueTypes["User"],
		__typename?: boolean | `@${string}`
}>;
	["UserMutation"]: AliasType<{
createVacation?: [{	vacation: ValueTypes["CreateVacation"] | Variable<any, string>},boolean | `@${string}`],
deleteVacation?: [{	_id: string | Variable<any, string>},boolean | `@${string}`],
logOps?: [{	_id: string | Variable<any, string>},ValueTypes["UserLogOps"]],
logTime?: [{	log: Array<ValueTypes["CreateLog"]> | Variable<any, string>},boolean | `@${string}`],
updateUserAccount?: [{	updateUserData?: ValueTypes["UpdateUserAccount"] | undefined | null | Variable<any, string>},boolean | `@${string}`],
		__typename?: boolean | `@${string}`
}>;
	["UserLogOps"]: AliasType<{
	delete?:boolean | `@${string}`,
update?: [{	log: ValueTypes["UpdateLog"] | Variable<any, string>},boolean | `@${string}`],
		__typename?: boolean | `@${string}`
}>;
	["CreateHourlyBilling"]: {
	currency: ValueTypes["Currency"] | Variable<any, string>,
	project: string | Variable<any, string>,
	user: string | Variable<any, string>,
	value: number | Variable<any, string>
};
	["LoginType"]:LoginType;
	["RegisterUserAccount"]: {
	/** to jest email */
	username: string | Variable<any, string>,
	password: string | Variable<any, string>,
	invitationToken: string | Variable<any, string>,
	nickname: string | Variable<any, string>
};
	["UpdateLog"]: {
	project?: string | undefined | null | Variable<any, string>,
	description?: string | undefined | null | Variable<any, string>,
	start?: ValueTypes["Time"] | undefined | null | Variable<any, string>,
	/** How many minutes from the date are logged */
	minutes?: number | undefined | null | Variable<any, string>,
	date?: ValueTypes["Date"] | undefined | null | Variable<any, string>
};
	["ProjectOps"]: AliasType<{
	archive?:boolean | `@${string}`,
	remove?:boolean | `@${string}`,
	unArchive?:boolean | `@${string}`,
update?: [{	projectUpdate?: ValueTypes["ProjectUpdate"] | undefined | null | Variable<any, string>},boolean | `@${string}`],
		__typename?: boolean | `@${string}`
}>;
	["GenerateOAuthTokenInput"]: {
	code: string | Variable<any, string>,
	social: ValueTypes["SocialKind"] | Variable<any, string>
};
	["ProjectUpdate"]: {
	client?: string | undefined | null | Variable<any, string>,
	name?: string | undefined | null | Variable<any, string>
};
	["PublicMutation"]: AliasType<{
changePassword?: [{	changePasswordData: ValueTypes["ChangePasswordInput"] | Variable<any, string>},boolean | `@${string}`],
generateOAuthToken?: [{	tokenData: ValueTypes["GenerateOAuthTokenInput"] | Variable<any, string>},boolean | `@${string}`],
integrateSocialAccount?: [{	userData: ValueTypes["SimpleUserInput"] | Variable<any, string>},boolean | `@${string}`],
registerAccount?: [{	user: ValueTypes["RegisterAccount"] | Variable<any, string>},boolean | `@${string}`],
registerUserAccount?: [{	user: ValueTypes["RegisterUserAccount"] | Variable<any, string>},boolean | `@${string}`],
verifyEmail?: [{	verifyData: ValueTypes["VerifyEmailInput"] | Variable<any, string>},boolean | `@${string}`],
		__typename?: boolean | `@${string}`
}>;
	["Query"]: AliasType<{
	admin?:ValueTypes["AdminQuery"],
	public?:ValueTypes["PublicQuery"],
	user?:ValueTypes["UserQuery"],
		__typename?: boolean | `@${string}`
}>;
	/** Stripe subscription with it's fields */
["Subscription"]: AliasType<{
	_id?:boolean | `@${string}`,
	amount?:boolean | `@${string}`,
	billingPeriodEnds?:boolean | `@${string}`,
	cancelAtPeriodEnd?:boolean | `@${string}`,
	canceledAt?:boolean | `@${string}`,
	currency?:boolean | `@${string}`,
	customerId?:boolean | `@${string}`,
	name?:boolean | `@${string}`,
	productId?:boolean | `@${string}`,
	scubscriptionId?:boolean | `@${string}`,
	status?:boolean | `@${string}`,
	username?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** bi */
["Billing"]:AliasType<{
		value?:boolean | `@${string}`,
	currency?:boolean | `@${string}`,
	/** Admin object with a name to identify administrator of all objects. Admin is an primary owner of the account */
	account?:ValueTypes["Account"],
	project?:ValueTypes["Project"];
		['...on FixedBilling']?: Omit<ValueTypes["FixedBilling"],keyof ValueTypes["Billing"]>;
		['...on HourlyBilling']?: Omit<ValueTypes["HourlyBilling"],keyof ValueTypes["Billing"]>;
		__typename?: boolean | `@${string}`
}>;
	["ClientUpdate"]: {
	name?: string | undefined | null | Variable<any, string>,
	projects?: Array<string> | undefined | null | Variable<any, string>
};
	["CreateFixedBilling"]: {
	value: number | Variable<any, string>,
	currency: ValueTypes["Currency"] | Variable<any, string>,
	project: string | Variable<any, string>
};
	["Archivable"]:AliasType<{
		archivedAt?:boolean | `@${string}`;
		['...on Client']?: Omit<ValueTypes["Client"],keyof ValueTypes["Archivable"]>;
		['...on Project']?: Omit<ValueTypes["Project"],keyof ValueTypes["Archivable"]>;
		__typename?: boolean | `@${string}`
}>;
	["SimpleUserInput"]: {
	password: string | Variable<any, string>,
	username: string | Variable<any, string>
}
  }

export type ResolverInputTypes = {
    ["LoginInput"]: {
	loginType: ResolverInputTypes["LoginType"],
	code?: string | undefined | null,
	username?: string | undefined | null,
	password?: string | undefined | null
};
	["DateTime"]:unknown;
	/** Time log of a user time */
["TimeLog"]: AliasType<{
	_id?:boolean | `@${string}`,
	account?:ResolverInputTypes["Account"],
	archivedAt?:boolean | `@${string}`,
	billable?:ResolverInputTypes["TimeLogBilled"],
	createdAt?:boolean | `@${string}`,
	date?:boolean | `@${string}`,
	description?:boolean | `@${string}`,
	/** How many minutes from the date are logged */
	minutes?:boolean | `@${string}`,
	project?:ResolverInputTypes["Project"],
	start?:boolean | `@${string}`,
	updatedAt?:boolean | `@${string}`,
	user?:ResolverInputTypes["User"],
		__typename?: boolean | `@${string}`
}>;
	["CreateClient"]: {
	name: string
};
	["ChangePasswordInput"]: {
	newPassword: string,
	username: string,
	forgotToken?: string | undefined | null,
	oldPassword?: string | undefined | null
};
	/** Admin object with a name to identify administrator of all objects. Admin is an primary owner of the account */
["Account"]: AliasType<{
	_id?:boolean | `@${string}`,
	customerId?:boolean | `@${string}`,
	name?:boolean | `@${string}`,
	role?:boolean | `@${string}`,
	username?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["TimeLogBilled"]: AliasType<{
	amountBilled?:boolean | `@${string}`,
	currency?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["UserOps"]: AliasType<{
	addAdmin?:boolean | `@${string}`,
createVacation?: [{	vacation: ResolverInputTypes["CreateVacation"]},boolean | `@${string}`],
	delAdmin?:boolean | `@${string}`,
deleteVacation?: [{	_id: string},boolean | `@${string}`],
	remove?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["SocialKind"]:SocialKind;
	["UpgradeAdminAccountInput"]: {
	cancelled_url: string,
	productId: string,
	success_url: string
};
	["Client"]: AliasType<{
	_id?:boolean | `@${string}`,
	account?:ResolverInputTypes["Account"],
	archivedAt?:boolean | `@${string}`,
	createdAt?:boolean | `@${string}`,
	name?:boolean | `@${string}`,
	projects?:ResolverInputTypes["Project"],
	updatedAt?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["CreateLog"]: {
	project: string,
	description?: string | undefined | null,
	start?: ResolverInputTypes["Time"] | undefined | null,
	/** How many minutes from the date are logged */
	minutes: number,
	date: ResolverInputTypes["Date"]
};
	["HourlyBillingOps"]: AliasType<{
	remove?:boolean | `@${string}`,
update?: [{	billingUpdate?: ResolverInputTypes["UpdateHourlyBilling"] | undefined | null},boolean | `@${string}`],
		__typename?: boolean | `@${string}`
}>;
	["UpdateFixedBilling"]: {
	value?: number | undefined | null,
	currency?: ResolverInputTypes["Currency"] | undefined | null,
	project?: string | undefined | null
};
	["RegisterAccount"]: {
	password: string,
	/** to jest email */
	username: string,
	/** to nazwa firmy */
	name: string,
	/** to unikalna nazwa usera */
	nickname: string
};
	/** 12:00 */
["Time"]:unknown;
	["InviteToken"]: AliasType<{
	domain?:boolean | `@${string}`,
	/** format dd/mm/rrrr */
	expires?:boolean | `@${string}`,
	owner?:boolean | `@${string}`,
	/** Admin object with a name to identify administrator of all objects. Admin is an primary owner of the account */
	token?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["UpdateHourlyBilling"]: {
	value?: number | undefined | null,
	currency?: ResolverInputTypes["Currency"] | undefined | null,
	project?: string | undefined | null,
	user?: string | undefined | null
};
	/** Queries for admin account */
["AdminQuery"]: AliasType<{
	/** Admin object with a name to identify administrator of all objects. Admin is an primary owner of the account */
	account?:ResolverInputTypes["Account"],
billingById?: [{	_id: string},ResolverInputTypes["Billing"]],
	billings?:ResolverInputTypes["Billing"],
clientById?: [{	_id: string},ResolverInputTypes["Client"]],
	clients?:ResolverInputTypes["Client"],
	getStripeProducts?:ResolverInputTypes["StripeProduct"],
logs?: [{	dateFilter: ResolverInputTypes["DateFilter"],	adminFilter?: ResolverInputTypes["AdminFilter"] | undefined | null},ResolverInputTypes["TimeLog"]],
projectById?: [{	_id: string},ResolverInputTypes["Project"]],
	projects?:ResolverInputTypes["Project"],
	tokens?:ResolverInputTypes["InviteToken"],
userById?: [{	_id: string},ResolverInputTypes["User"]],
	/** User of an admin account who logs time */
	users?:ResolverInputTypes["User"],
vacations?: [{	date?: ResolverInputTypes["DateFilter"] | undefined | null},ResolverInputTypes["Vacation"]],
		__typename?: boolean | `@${string}`
}>;
	["StripeProduct"]: AliasType<{
	currency?:boolean | `@${string}`,
	description?:boolean | `@${string}`,
	interval?:boolean | `@${string}`,
	interval_count?:boolean | `@${string}`,
	name?:boolean | `@${string}`,
	price_id?:boolean | `@${string}`,
	price_value?:boolean | `@${string}`,
	product_id?:boolean | `@${string}`,
	trial_period_days?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["FixedBilling"]: AliasType<{
	_id?:boolean | `@${string}`,
	/** Admin object with a name to identify administrator of all objects. Admin is an primary owner of the account */
	account?:ResolverInputTypes["Account"],
	createdAt?:boolean | `@${string}`,
	currency?:boolean | `@${string}`,
	project?:ResolverInputTypes["Project"],
	updatedAt?:boolean | `@${string}`,
	value?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["UserQuery"]: AliasType<{
	clients?:ResolverInputTypes["Client"],
logs?: [{	dateFilter: ResolverInputTypes["DateFilter"]},ResolverInputTypes["TimeLog"]],
	/** User of an admin account who logs time */
	me?:ResolverInputTypes["User"],
	projects?:ResolverInputTypes["Project"],
vacations?: [{	date?: ResolverInputTypes["DateFilter"] | undefined | null},ResolverInputTypes["Vacation"]],
		__typename?: boolean | `@${string}`
}>;
	["Project"]: AliasType<{
	_id?:boolean | `@${string}`,
	account?:ResolverInputTypes["Account"],
	archivedAt?:boolean | `@${string}`,
	client?:ResolverInputTypes["Client"],
	createdAt?:boolean | `@${string}`,
	name?:boolean | `@${string}`,
	updatedAt?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** Mutations for admin account */
["AdminMutation"]: AliasType<{
clientOps?: [{	id: string},ResolverInputTypes["ClientOps"]],
createClient?: [{	createClient: ResolverInputTypes["CreateClient"]},boolean | `@${string}`],
createFixedBilling?: [{	billing: ResolverInputTypes["CreateFixedBilling"]},boolean | `@${string}`],
createHourlyBilling?: [{	billing: ResolverInputTypes["CreateHourlyBilling"]},boolean | `@${string}`],
createProject?: [{	createProject: ResolverInputTypes["CreateProject"]},boolean | `@${string}`],
deleteInviteToken?: [{	token: string},boolean | `@${string}`],
fixedBillingOps?: [{	id: string},ResolverInputTypes["FixedBillingOps"]],
generateBillingPortal?: [{	returnUrl: string},boolean | `@${string}`],
generateCheckoutSession?: [{	success_url: string,	cancel_url: string,	productIds: Array<string>},boolean | `@${string}`],
generateInviteToken?: [{	/** string format dd/mm/rrrr */
	tokenOptions: ResolverInputTypes["InviteTokenInput"]},boolean | `@${string}`],
hourlyBillingOps?: [{	id: string},ResolverInputTypes["HourlyBillingOps"]],
projectOps?: [{	id: string},ResolverInputTypes["ProjectOps"]],
removeUserFromTeam?: [{	username: string},boolean | `@${string}`],
upgradeAccount?: [{	upgradeInput: ResolverInputTypes["UpgradeAdminAccountInput"]},boolean | `@${string}`],
userOps?: [{	id: string},ResolverInputTypes["UserOps"]],
		__typename?: boolean | `@${string}`
}>;
	["InviteTokenInput"]: {
	expires?: ResolverInputTypes["DateTime"] | undefined | null,
	domain?: string | undefined | null
};
	["PublicQuery"]: AliasType<{
	getAppleOAuthLink?:boolean | `@${string}`,
getGithubOAuthLink?: [{	scopes: Array<string | undefined | null>},boolean | `@${string}`],
	getGoogleOAuthLink?:boolean | `@${string}`,
login?: [{	user: ResolverInputTypes["LoginInput"]},boolean | `@${string}`],
requestForForgotPassword?: [{	username: string},boolean | `@${string}`],
		__typename?: boolean | `@${string}`
}>;
	/** # Roles
- Employee doesn't have role
- Owner is the person who created the account
- Admin is the person given admin rights by owner */
["Role"]:Role;
	/** string format "rrrr-mm-dd" */
["Date"]:unknown;
	["CreateVacation"]: {
	date: string
};
	["UpdateUserAccount"]: {
	username?: string | undefined | null,
	password?: string | undefined | null,
	nickname?: string | undefined | null
};
	["ClientOps"]: AliasType<{
	archive?:boolean | `@${string}`,
	remove?:boolean | `@${string}`,
	unArchive?:boolean | `@${string}`,
update?: [{	clientUpdate?: ResolverInputTypes["ClientUpdate"] | undefined | null},boolean | `@${string}`],
		__typename?: boolean | `@${string}`
}>;
	["VerifyEmailInput"]: {
	username: string,
	token: string
};
	["HourlyBilling"]: AliasType<{
	_id?:boolean | `@${string}`,
	/** Admin object with a name to identify administrator of all objects. Admin is an primary owner of the account */
	account?:ResolverInputTypes["Account"],
	createdAt?:boolean | `@${string}`,
	currency?:boolean | `@${string}`,
	project?:ResolverInputTypes["Project"],
	updatedAt?:boolean | `@${string}`,
	/** User of an admin account who logs time */
	user?:ResolverInputTypes["User"],
	value?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["Node"]:AliasType<{
		updatedAt?:boolean | `@${string}`,
	_id?:boolean | `@${string}`,
	createdAt?:boolean | `@${string}`;
		['...on TimeLog']?: Omit<ResolverInputTypes["TimeLog"],keyof ResolverInputTypes["Node"]>;
		['...on Client']?: Omit<ResolverInputTypes["Client"],keyof ResolverInputTypes["Node"]>;
		['...on FixedBilling']?: Omit<ResolverInputTypes["FixedBilling"],keyof ResolverInputTypes["Node"]>;
		['...on Project']?: Omit<ResolverInputTypes["Project"],keyof ResolverInputTypes["Node"]>;
		['...on HourlyBilling']?: Omit<ResolverInputTypes["HourlyBilling"],keyof ResolverInputTypes["Node"]>;
		__typename?: boolean | `@${string}`
}>;
	/** User of an admin account who logs time */
["User"]: AliasType<{
	_id?:boolean | `@${string}`,
	/** Every user belongs to an admin account. We expose admin even it exists for scoping and db purposes */
	account?:ResolverInputTypes["Account"],
	/** to unikalna nazwa usera */
	nickname?:boolean | `@${string}`,
	role?:boolean | `@${string}`,
	/** to jest email */
	username?:boolean | `@${string}`,
	vacations?:ResolverInputTypes["Vacation"],
		__typename?: boolean | `@${string}`
}>;
	["Currency"]:Currency;
	["Mutation"]: AliasType<{
	admin?:ResolverInputTypes["AdminMutation"],
	publicMutation?:ResolverInputTypes["PublicMutation"],
	user?:ResolverInputTypes["UserMutation"],
	/** entry point for Weebhooks. */
	webhook?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["FixedBillingOps"]: AliasType<{
	remove?:boolean | `@${string}`,
update?: [{	billingUpdate?: ResolverInputTypes["UpdateFixedBilling"] | undefined | null},boolean | `@${string}`],
		__typename?: boolean | `@${string}`
}>;
	["DateFilter"]: {
	from: ResolverInputTypes["Date"],
	to?: ResolverInputTypes["Date"] | undefined | null
};
	["AdminFilter"]: {
	user_ids?: Array<string> | undefined | null,
	client_ids?: Array<string> | undefined | null,
	project_ids?: Array<string> | undefined | null,
	asCurrency?: ResolverInputTypes["Currency"] | undefined | null
};
	["CreateProject"]: {
	client: string,
	name: string
};
	["Vacation"]: AliasType<{
	_id?:boolean | `@${string}`,
	account?:ResolverInputTypes["Account"],
	administrable?:boolean | `@${string}`,
	createdAt?:boolean | `@${string}`,
	date?:boolean | `@${string}`,
	updatedAt?:boolean | `@${string}`,
	user?:ResolverInputTypes["User"],
		__typename?: boolean | `@${string}`
}>;
	["UserMutation"]: AliasType<{
createVacation?: [{	vacation: ResolverInputTypes["CreateVacation"]},boolean | `@${string}`],
deleteVacation?: [{	_id: string},boolean | `@${string}`],
logOps?: [{	_id: string},ResolverInputTypes["UserLogOps"]],
logTime?: [{	log: Array<ResolverInputTypes["CreateLog"]>},boolean | `@${string}`],
updateUserAccount?: [{	updateUserData?: ResolverInputTypes["UpdateUserAccount"] | undefined | null},boolean | `@${string}`],
		__typename?: boolean | `@${string}`
}>;
	["UserLogOps"]: AliasType<{
	delete?:boolean | `@${string}`,
update?: [{	log: ResolverInputTypes["UpdateLog"]},boolean | `@${string}`],
		__typename?: boolean | `@${string}`
}>;
	["CreateHourlyBilling"]: {
	currency: ResolverInputTypes["Currency"],
	project: string,
	user: string,
	value: number
};
	["LoginType"]:LoginType;
	["RegisterUserAccount"]: {
	/** to jest email */
	username: string,
	password: string,
	invitationToken: string,
	nickname: string
};
	["UpdateLog"]: {
	project?: string | undefined | null,
	description?: string | undefined | null,
	start?: ResolverInputTypes["Time"] | undefined | null,
	/** How many minutes from the date are logged */
	minutes?: number | undefined | null,
	date?: ResolverInputTypes["Date"] | undefined | null
};
	["ProjectOps"]: AliasType<{
	archive?:boolean | `@${string}`,
	remove?:boolean | `@${string}`,
	unArchive?:boolean | `@${string}`,
update?: [{	projectUpdate?: ResolverInputTypes["ProjectUpdate"] | undefined | null},boolean | `@${string}`],
		__typename?: boolean | `@${string}`
}>;
	["GenerateOAuthTokenInput"]: {
	code: string,
	social: ResolverInputTypes["SocialKind"]
};
	["ProjectUpdate"]: {
	client?: string | undefined | null,
	name?: string | undefined | null
};
	["PublicMutation"]: AliasType<{
changePassword?: [{	changePasswordData: ResolverInputTypes["ChangePasswordInput"]},boolean | `@${string}`],
generateOAuthToken?: [{	tokenData: ResolverInputTypes["GenerateOAuthTokenInput"]},boolean | `@${string}`],
integrateSocialAccount?: [{	userData: ResolverInputTypes["SimpleUserInput"]},boolean | `@${string}`],
registerAccount?: [{	user: ResolverInputTypes["RegisterAccount"]},boolean | `@${string}`],
registerUserAccount?: [{	user: ResolverInputTypes["RegisterUserAccount"]},boolean | `@${string}`],
verifyEmail?: [{	verifyData: ResolverInputTypes["VerifyEmailInput"]},boolean | `@${string}`],
		__typename?: boolean | `@${string}`
}>;
	["Query"]: AliasType<{
	admin?:ResolverInputTypes["AdminQuery"],
	public?:ResolverInputTypes["PublicQuery"],
	user?:ResolverInputTypes["UserQuery"],
		__typename?: boolean | `@${string}`
}>;
	/** Stripe subscription with it's fields */
["Subscription"]: AliasType<{
	_id?:boolean | `@${string}`,
	amount?:boolean | `@${string}`,
	billingPeriodEnds?:boolean | `@${string}`,
	cancelAtPeriodEnd?:boolean | `@${string}`,
	canceledAt?:boolean | `@${string}`,
	currency?:boolean | `@${string}`,
	customerId?:boolean | `@${string}`,
	name?:boolean | `@${string}`,
	productId?:boolean | `@${string}`,
	scubscriptionId?:boolean | `@${string}`,
	status?:boolean | `@${string}`,
	username?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** bi */
["Billing"]:AliasType<{
		value?:boolean | `@${string}`,
	currency?:boolean | `@${string}`,
	/** Admin object with a name to identify administrator of all objects. Admin is an primary owner of the account */
	account?:ResolverInputTypes["Account"],
	project?:ResolverInputTypes["Project"];
		['...on FixedBilling']?: Omit<ResolverInputTypes["FixedBilling"],keyof ResolverInputTypes["Billing"]>;
		['...on HourlyBilling']?: Omit<ResolverInputTypes["HourlyBilling"],keyof ResolverInputTypes["Billing"]>;
		__typename?: boolean | `@${string}`
}>;
	["ClientUpdate"]: {
	name?: string | undefined | null,
	projects?: Array<string> | undefined | null
};
	["CreateFixedBilling"]: {
	value: number,
	currency: ResolverInputTypes["Currency"],
	project: string
};
	["Archivable"]:AliasType<{
		archivedAt?:boolean | `@${string}`;
		['...on Client']?: Omit<ResolverInputTypes["Client"],keyof ResolverInputTypes["Archivable"]>;
		['...on Project']?: Omit<ResolverInputTypes["Project"],keyof ResolverInputTypes["Archivable"]>;
		__typename?: boolean | `@${string}`
}>;
	["SimpleUserInput"]: {
	password: string,
	username: string
}
  }

export type ModelTypes = {
    ["LoginInput"]: {
	loginType: ModelTypes["LoginType"],
	code?: string | undefined,
	username?: string | undefined,
	password?: string | undefined
};
	["DateTime"]:any;
	/** Time log of a user time */
["TimeLog"]: {
		_id: string,
	account: ModelTypes["Account"],
	archivedAt?: ModelTypes["DateTime"] | undefined,
	billable?: ModelTypes["TimeLogBilled"] | undefined,
	createdAt: ModelTypes["DateTime"],
	date: ModelTypes["Date"],
	description?: string | undefined,
	/** How many minutes from the date are logged */
	minutes: number,
	project: ModelTypes["Project"],
	start?: ModelTypes["Time"] | undefined,
	updatedAt: ModelTypes["DateTime"],
	user: ModelTypes["User"]
};
	["CreateClient"]: {
	name: string
};
	["ChangePasswordInput"]: {
	newPassword: string,
	username: string,
	forgotToken?: string | undefined,
	oldPassword?: string | undefined
};
	/** Admin object with a name to identify administrator of all objects. Admin is an primary owner of the account */
["Account"]: {
		_id: string,
	customerId: string,
	name: string,
	role: string,
	username: string
};
	["TimeLogBilled"]: {
		amountBilled: number,
	currency: ModelTypes["Currency"]
};
	["UserOps"]: {
		addAdmin?: boolean | undefined,
	createVacation?: string | undefined,
	delAdmin?: boolean | undefined,
	deleteVacation?: boolean | undefined,
	remove?: boolean | undefined
};
	["SocialKind"]:SocialKind;
	["UpgradeAdminAccountInput"]: {
	cancelled_url: string,
	productId: string,
	success_url: string
};
	["Client"]: {
		_id: string,
	account: ModelTypes["Account"],
	archivedAt?: ModelTypes["DateTime"] | undefined,
	createdAt: ModelTypes["DateTime"],
	name: string,
	projects: Array<ModelTypes["Project"]>,
	updatedAt: ModelTypes["DateTime"]
};
	["CreateLog"]: {
	project: string,
	description?: string | undefined,
	start?: ModelTypes["Time"] | undefined,
	/** How many minutes from the date are logged */
	minutes: number,
	date: ModelTypes["Date"]
};
	["HourlyBillingOps"]: {
		remove?: boolean | undefined,
	update?: boolean | undefined
};
	["UpdateFixedBilling"]: {
	value?: number | undefined,
	currency?: ModelTypes["Currency"] | undefined,
	project?: string | undefined
};
	["RegisterAccount"]: {
	password: string,
	/** to jest email */
	username: string,
	/** to nazwa firmy */
	name: string,
	/** to unikalna nazwa usera */
	nickname: string
};
	/** 12:00 */
["Time"]:any;
	["InviteToken"]: {
		domain?: string | undefined,
	/** format dd/mm/rrrr */
	expires?: string | undefined,
	owner: string,
	/** Admin object with a name to identify administrator of all objects. Admin is an primary owner of the account */
	token: string
};
	["UpdateHourlyBilling"]: {
	value?: number | undefined,
	currency?: ModelTypes["Currency"] | undefined,
	project?: string | undefined,
	user?: string | undefined
};
	/** Queries for admin account */
["AdminQuery"]: {
		/** Admin object with a name to identify administrator of all objects. Admin is an primary owner of the account */
	account: ModelTypes["Account"],
	billingById?: ModelTypes["Billing"] | undefined,
	billings: Array<ModelTypes["Billing"]>,
	clientById?: ModelTypes["Client"] | undefined,
	clients: Array<ModelTypes["Client"]>,
	getStripeProducts?: Array<ModelTypes["StripeProduct"] | undefined> | undefined,
	/** Logs of all users from the account */
	logs: Array<ModelTypes["TimeLog"]>,
	projectById?: ModelTypes["Project"] | undefined,
	projects: Array<ModelTypes["Project"]>,
	tokens: Array<ModelTypes["InviteToken"]>,
	/** User of an admin account who logs time */
	userById?: ModelTypes["User"] | undefined,
	/** User of an admin account who logs time */
	users: Array<ModelTypes["User"]>,
	vacations: Array<ModelTypes["Vacation"]>
};
	["StripeProduct"]: {
		currency?: string | undefined,
	description?: string | undefined,
	interval: string,
	interval_count?: number | undefined,
	name: string,
	price_id: string,
	price_value?: string | undefined,
	product_id: string,
	trial_period_days?: number | undefined
};
	["FixedBilling"]: {
		_id: string,
	/** Admin object with a name to identify administrator of all objects. Admin is an primary owner of the account */
	account: ModelTypes["Account"],
	createdAt: ModelTypes["DateTime"],
	currency: ModelTypes["Currency"],
	project?: ModelTypes["Project"] | undefined,
	updatedAt: ModelTypes["DateTime"],
	value: number
};
	["UserQuery"]: {
		clients: Array<ModelTypes["Client"]>,
	logs: Array<ModelTypes["TimeLog"]>,
	/** User of an admin account who logs time */
	me: ModelTypes["User"],
	projects: Array<ModelTypes["Project"]>,
	vacations: Array<ModelTypes["Vacation"]>
};
	["Project"]: {
		_id: string,
	account: ModelTypes["Account"],
	archivedAt?: ModelTypes["DateTime"] | undefined,
	client: ModelTypes["Client"],
	createdAt: ModelTypes["DateTime"],
	name: string,
	updatedAt: ModelTypes["DateTime"]
};
	/** Mutations for admin account */
["AdminMutation"]: {
		clientOps?: ModelTypes["ClientOps"] | undefined,
	createClient?: string | undefined,
	createFixedBilling: string,
	createHourlyBilling: string,
	createProject: string,
	deleteInviteToken?: boolean | undefined,
	fixedBillingOps?: ModelTypes["FixedBillingOps"] | undefined,
	/** Generates link to billing portal where users control their subscriptions */
	generateBillingPortal: string,
	/** Generates link for payment */
	generateCheckoutSession: string,
	generateInviteToken: string,
	hourlyBillingOps?: ModelTypes["HourlyBillingOps"] | undefined,
	projectOps?: ModelTypes["ProjectOps"] | undefined,
	removeUserFromTeam: boolean,
	upgradeAccount?: string | undefined,
	userOps?: ModelTypes["UserOps"] | undefined
};
	["InviteTokenInput"]: {
	expires?: ModelTypes["DateTime"] | undefined,
	domain?: string | undefined
};
	["PublicQuery"]: {
		getAppleOAuthLink: string,
	getGithubOAuthLink: string,
	getGoogleOAuthLink: string,
	login: string,
	requestForForgotPassword: boolean
};
	["Role"]:Role;
	/** string format "rrrr-mm-dd" */
["Date"]:any;
	["CreateVacation"]: {
	date: string
};
	["UpdateUserAccount"]: {
	username?: string | undefined,
	password?: string | undefined,
	nickname?: string | undefined
};
	["ClientOps"]: {
		archive?: boolean | undefined,
	remove?: boolean | undefined,
	unArchive?: boolean | undefined,
	update?: boolean | undefined
};
	["VerifyEmailInput"]: {
	username: string,
	token: string
};
	["HourlyBilling"]: {
		_id: string,
	/** Admin object with a name to identify administrator of all objects. Admin is an primary owner of the account */
	account: ModelTypes["Account"],
	createdAt: ModelTypes["DateTime"],
	currency: ModelTypes["Currency"],
	project: ModelTypes["Project"],
	updatedAt: ModelTypes["DateTime"],
	/** User of an admin account who logs time */
	user: ModelTypes["User"],
	value: number
};
	["Node"]: ModelTypes["TimeLog"] | ModelTypes["Client"] | ModelTypes["FixedBilling"] | ModelTypes["Project"] | ModelTypes["HourlyBilling"];
	/** User of an admin account who logs time */
["User"]: {
		_id: string,
	/** Every user belongs to an admin account. We expose admin even it exists for scoping and db purposes */
	account: ModelTypes["Account"],
	/** to unikalna nazwa usera */
	nickname: string,
	role?: ModelTypes["Role"] | undefined,
	/** to jest email */
	username: string,
	vacations?: Array<ModelTypes["Vacation"]> | undefined
};
	["Currency"]:Currency;
	["Mutation"]: {
		admin?: ModelTypes["AdminMutation"] | undefined,
	publicMutation?: ModelTypes["PublicMutation"] | undefined,
	user?: ModelTypes["UserMutation"] | undefined,
	/** entry point for Weebhooks. */
	webhook?: string | undefined
};
	["FixedBillingOps"]: {
		remove?: boolean | undefined,
	update?: boolean | undefined
};
	["DateFilter"]: {
	from: ModelTypes["Date"],
	to?: ModelTypes["Date"] | undefined
};
	["AdminFilter"]: {
	user_ids?: Array<string> | undefined,
	client_ids?: Array<string> | undefined,
	project_ids?: Array<string> | undefined,
	asCurrency?: ModelTypes["Currency"] | undefined
};
	["CreateProject"]: {
	client: string,
	name: string
};
	["Vacation"]: {
		_id: string,
	account: ModelTypes["Account"],
	administrable?: boolean | undefined,
	createdAt: string,
	date: string,
	updatedAt: string,
	user: ModelTypes["User"]
};
	["UserMutation"]: {
		createVacation?: string | undefined,
	deleteVacation?: boolean | undefined,
	logOps?: ModelTypes["UserLogOps"] | undefined,
	/** This is the most important mutation of the system.

## Behavior

When user logs time system creates a TimeLog object and finds suitable billing object for the log therefore it calculates the log value

## Db Storage

Log is stored on the admin account that user belongs to */
	logTime?: Array<string> | undefined,
	updateUserAccount?: string | undefined
};
	["UserLogOps"]: {
		delete?: boolean | undefined,
	update?: boolean | undefined
};
	["CreateHourlyBilling"]: {
	currency: ModelTypes["Currency"],
	project: string,
	user: string,
	value: number
};
	["LoginType"]:LoginType;
	["RegisterUserAccount"]: {
	/** to jest email */
	username: string,
	password: string,
	invitationToken: string,
	nickname: string
};
	["UpdateLog"]: {
	project?: string | undefined,
	description?: string | undefined,
	start?: ModelTypes["Time"] | undefined,
	/** How many minutes from the date are logged */
	minutes?: number | undefined,
	date?: ModelTypes["Date"] | undefined
};
	["ProjectOps"]: {
		archive?: boolean | undefined,
	remove?: boolean | undefined,
	unArchive?: boolean | undefined,
	update?: boolean | undefined
};
	["GenerateOAuthTokenInput"]: {
	code: string,
	social: ModelTypes["SocialKind"]
};
	["ProjectUpdate"]: {
	client?: string | undefined,
	name?: string | undefined
};
	["PublicMutation"]: {
		changePassword: boolean,
	generateOAuthToken: boolean,
	integrateSocialAccount: boolean,
	registerAccount?: boolean | undefined,
	registerUserAccount: boolean,
	verifyEmail: boolean
};
	["Query"]: {
		admin?: ModelTypes["AdminQuery"] | undefined,
	public?: ModelTypes["PublicQuery"] | undefined,
	user?: ModelTypes["UserQuery"] | undefined
};
	/** Stripe subscription with it's fields */
["Subscription"]: {
		_id: string,
	amount: number,
	billingPeriodEnds: number,
	cancelAtPeriodEnd: boolean,
	canceledAt?: number | undefined,
	currency: string,
	customerId: string,
	name: string,
	productId: string,
	scubscriptionId: string,
	status: string,
	username: string
};
	/** bi */
["Billing"]: ModelTypes["FixedBilling"] | ModelTypes["HourlyBilling"];
	["ClientUpdate"]: {
	name?: string | undefined,
	projects?: Array<string> | undefined
};
	["CreateFixedBilling"]: {
	value: number,
	currency: ModelTypes["Currency"],
	project: string
};
	["Archivable"]: ModelTypes["Client"] | ModelTypes["Project"];
	["SimpleUserInput"]: {
	password: string,
	username: string
}
    }

export type GraphQLTypes = {
    ["LoginInput"]: {
		loginType: GraphQLTypes["LoginType"],
	code?: string | undefined,
	username?: string | undefined,
	password?: string | undefined
};
	["DateTime"]: "scalar" & { name: "DateTime" };
	/** Time log of a user time */
["TimeLog"]: {
	__typename: "TimeLog",
	_id: string,
	account: GraphQLTypes["Account"],
	archivedAt?: GraphQLTypes["DateTime"] | undefined,
	billable?: GraphQLTypes["TimeLogBilled"] | undefined,
	createdAt: GraphQLTypes["DateTime"],
	date: GraphQLTypes["Date"],
	description?: string | undefined,
	/** How many minutes from the date are logged */
	minutes: number,
	project: GraphQLTypes["Project"],
	start?: GraphQLTypes["Time"] | undefined,
	updatedAt: GraphQLTypes["DateTime"],
	user: GraphQLTypes["User"]
};
	["CreateClient"]: {
		name: string
};
	["ChangePasswordInput"]: {
		newPassword: string,
	username: string,
	forgotToken?: string | undefined,
	oldPassword?: string | undefined
};
	/** Admin object with a name to identify administrator of all objects. Admin is an primary owner of the account */
["Account"]: {
	__typename: "Account",
	_id: string,
	customerId: string,
	name: string,
	role: string,
	username: string
};
	["TimeLogBilled"]: {
	__typename: "TimeLogBilled",
	amountBilled: number,
	currency: GraphQLTypes["Currency"]
};
	["UserOps"]: {
	__typename: "UserOps",
	addAdmin?: boolean | undefined,
	createVacation?: string | undefined,
	delAdmin?: boolean | undefined,
	deleteVacation?: boolean | undefined,
	remove?: boolean | undefined
};
	["SocialKind"]: SocialKind;
	["UpgradeAdminAccountInput"]: {
		cancelled_url: string,
	productId: string,
	success_url: string
};
	["Client"]: {
	__typename: "Client",
	_id: string,
	account: GraphQLTypes["Account"],
	archivedAt?: GraphQLTypes["DateTime"] | undefined,
	createdAt: GraphQLTypes["DateTime"],
	name: string,
	projects: Array<GraphQLTypes["Project"]>,
	updatedAt: GraphQLTypes["DateTime"]
};
	["CreateLog"]: {
		project: string,
	description?: string | undefined,
	start?: GraphQLTypes["Time"] | undefined,
	/** How many minutes from the date are logged */
	minutes: number,
	date: GraphQLTypes["Date"]
};
	["HourlyBillingOps"]: {
	__typename: "HourlyBillingOps",
	remove?: boolean | undefined,
	update?: boolean | undefined
};
	["UpdateFixedBilling"]: {
		value?: number | undefined,
	currency?: GraphQLTypes["Currency"] | undefined,
	project?: string | undefined
};
	["RegisterAccount"]: {
		password: string,
	/** to jest email */
	username: string,
	/** to nazwa firmy */
	name: string,
	/** to unikalna nazwa usera */
	nickname: string
};
	/** 12:00 */
["Time"]: "scalar" & { name: "Time" };
	["InviteToken"]: {
	__typename: "InviteToken",
	domain?: string | undefined,
	/** format dd/mm/rrrr */
	expires?: string | undefined,
	owner: string,
	/** Admin object with a name to identify administrator of all objects. Admin is an primary owner of the account */
	token: string
};
	["UpdateHourlyBilling"]: {
		value?: number | undefined,
	currency?: GraphQLTypes["Currency"] | undefined,
	project?: string | undefined,
	user?: string | undefined
};
	/** Queries for admin account */
["AdminQuery"]: {
	__typename: "AdminQuery",
	/** Admin object with a name to identify administrator of all objects. Admin is an primary owner of the account */
	account: GraphQLTypes["Account"],
	billingById?: GraphQLTypes["Billing"] | undefined,
	billings: Array<GraphQLTypes["Billing"]>,
	clientById?: GraphQLTypes["Client"] | undefined,
	clients: Array<GraphQLTypes["Client"]>,
	getStripeProducts?: Array<GraphQLTypes["StripeProduct"] | undefined> | undefined,
	/** Logs of all users from the account */
	logs: Array<GraphQLTypes["TimeLog"]>,
	projectById?: GraphQLTypes["Project"] | undefined,
	projects: Array<GraphQLTypes["Project"]>,
	tokens: Array<GraphQLTypes["InviteToken"]>,
	/** User of an admin account who logs time */
	userById?: GraphQLTypes["User"] | undefined,
	/** User of an admin account who logs time */
	users: Array<GraphQLTypes["User"]>,
	vacations: Array<GraphQLTypes["Vacation"]>
};
	["StripeProduct"]: {
	__typename: "StripeProduct",
	currency?: string | undefined,
	description?: string | undefined,
	interval: string,
	interval_count?: number | undefined,
	name: string,
	price_id: string,
	price_value?: string | undefined,
	product_id: string,
	trial_period_days?: number | undefined
};
	["FixedBilling"]: {
	__typename: "FixedBilling",
	_id: string,
	/** Admin object with a name to identify administrator of all objects. Admin is an primary owner of the account */
	account: GraphQLTypes["Account"],
	createdAt: GraphQLTypes["DateTime"],
	currency: GraphQLTypes["Currency"],
	project?: GraphQLTypes["Project"] | undefined,
	updatedAt: GraphQLTypes["DateTime"],
	value: number
};
	["UserQuery"]: {
	__typename: "UserQuery",
	clients: Array<GraphQLTypes["Client"]>,
	logs: Array<GraphQLTypes["TimeLog"]>,
	/** User of an admin account who logs time */
	me: GraphQLTypes["User"],
	projects: Array<GraphQLTypes["Project"]>,
	vacations: Array<GraphQLTypes["Vacation"]>
};
	["Project"]: {
	__typename: "Project",
	_id: string,
	account: GraphQLTypes["Account"],
	archivedAt?: GraphQLTypes["DateTime"] | undefined,
	client: GraphQLTypes["Client"],
	createdAt: GraphQLTypes["DateTime"],
	name: string,
	updatedAt: GraphQLTypes["DateTime"]
};
	/** Mutations for admin account */
["AdminMutation"]: {
	__typename: "AdminMutation",
	clientOps?: GraphQLTypes["ClientOps"] | undefined,
	createClient?: string | undefined,
	createFixedBilling: string,
	createHourlyBilling: string,
	createProject: string,
	deleteInviteToken?: boolean | undefined,
	fixedBillingOps?: GraphQLTypes["FixedBillingOps"] | undefined,
	/** Generates link to billing portal where users control their subscriptions */
	generateBillingPortal: string,
	/** Generates link for payment */
	generateCheckoutSession: string,
	generateInviteToken: string,
	hourlyBillingOps?: GraphQLTypes["HourlyBillingOps"] | undefined,
	projectOps?: GraphQLTypes["ProjectOps"] | undefined,
	removeUserFromTeam: boolean,
	upgradeAccount?: string | undefined,
	userOps?: GraphQLTypes["UserOps"] | undefined
};
	["InviteTokenInput"]: {
		expires?: GraphQLTypes["DateTime"] | undefined,
	domain?: string | undefined
};
	["PublicQuery"]: {
	__typename: "PublicQuery",
	getAppleOAuthLink: string,
	getGithubOAuthLink: string,
	getGoogleOAuthLink: string,
	login: string,
	requestForForgotPassword: boolean
};
	/** # Roles
- Employee doesn't have role
- Owner is the person who created the account
- Admin is the person given admin rights by owner */
["Role"]: Role;
	/** string format "rrrr-mm-dd" */
["Date"]: "scalar" & { name: "Date" };
	["CreateVacation"]: {
		date: string
};
	["UpdateUserAccount"]: {
		username?: string | undefined,
	password?: string | undefined,
	nickname?: string | undefined
};
	["ClientOps"]: {
	__typename: "ClientOps",
	archive?: boolean | undefined,
	remove?: boolean | undefined,
	unArchive?: boolean | undefined,
	update?: boolean | undefined
};
	["VerifyEmailInput"]: {
		username: string,
	token: string
};
	["HourlyBilling"]: {
	__typename: "HourlyBilling",
	_id: string,
	/** Admin object with a name to identify administrator of all objects. Admin is an primary owner of the account */
	account: GraphQLTypes["Account"],
	createdAt: GraphQLTypes["DateTime"],
	currency: GraphQLTypes["Currency"],
	project: GraphQLTypes["Project"],
	updatedAt: GraphQLTypes["DateTime"],
	/** User of an admin account who logs time */
	user: GraphQLTypes["User"],
	value: number
};
	["Node"]: {
	__typename:"TimeLog" | "Client" | "FixedBilling" | "Project" | "HourlyBilling",
	updatedAt: GraphQLTypes["DateTime"],
	_id: string,
	createdAt: GraphQLTypes["DateTime"]
	['...on TimeLog']: '__union' & GraphQLTypes["TimeLog"];
	['...on Client']: '__union' & GraphQLTypes["Client"];
	['...on FixedBilling']: '__union' & GraphQLTypes["FixedBilling"];
	['...on Project']: '__union' & GraphQLTypes["Project"];
	['...on HourlyBilling']: '__union' & GraphQLTypes["HourlyBilling"];
};
	/** User of an admin account who logs time */
["User"]: {
	__typename: "User",
	_id: string,
	/** Every user belongs to an admin account. We expose admin even it exists for scoping and db purposes */
	account: GraphQLTypes["Account"],
	/** to unikalna nazwa usera */
	nickname: string,
	role?: GraphQLTypes["Role"] | undefined,
	/** to jest email */
	username: string,
	vacations?: Array<GraphQLTypes["Vacation"]> | undefined
};
	["Currency"]: Currency;
	["Mutation"]: {
	__typename: "Mutation",
	admin?: GraphQLTypes["AdminMutation"] | undefined,
	publicMutation?: GraphQLTypes["PublicMutation"] | undefined,
	user?: GraphQLTypes["UserMutation"] | undefined,
	/** entry point for Weebhooks. */
	webhook?: string | undefined
};
	["FixedBillingOps"]: {
	__typename: "FixedBillingOps",
	remove?: boolean | undefined,
	update?: boolean | undefined
};
	["DateFilter"]: {
		from: GraphQLTypes["Date"],
	to?: GraphQLTypes["Date"] | undefined
};
	["AdminFilter"]: {
		user_ids?: Array<string> | undefined,
	client_ids?: Array<string> | undefined,
	project_ids?: Array<string> | undefined,
	asCurrency?: GraphQLTypes["Currency"] | undefined
};
	["CreateProject"]: {
		client: string,
	name: string
};
	["Vacation"]: {
	__typename: "Vacation",
	_id: string,
	account: GraphQLTypes["Account"],
	administrable?: boolean | undefined,
	createdAt: string,
	date: string,
	updatedAt: string,
	user: GraphQLTypes["User"]
};
	["UserMutation"]: {
	__typename: "UserMutation",
	createVacation?: string | undefined,
	deleteVacation?: boolean | undefined,
	logOps?: GraphQLTypes["UserLogOps"] | undefined,
	/** This is the most important mutation of the system.

## Behavior

When user logs time system creates a TimeLog object and finds suitable billing object for the log therefore it calculates the log value

## Db Storage

Log is stored on the admin account that user belongs to */
	logTime?: Array<string> | undefined,
	updateUserAccount?: string | undefined
};
	["UserLogOps"]: {
	__typename: "UserLogOps",
	delete?: boolean | undefined,
	update?: boolean | undefined
};
	["CreateHourlyBilling"]: {
		currency: GraphQLTypes["Currency"],
	project: string,
	user: string,
	value: number
};
	["LoginType"]: LoginType;
	["RegisterUserAccount"]: {
		/** to jest email */
	username: string,
	password: string,
	invitationToken: string,
	nickname: string
};
	["UpdateLog"]: {
		project?: string | undefined,
	description?: string | undefined,
	start?: GraphQLTypes["Time"] | undefined,
	/** How many minutes from the date are logged */
	minutes?: number | undefined,
	date?: GraphQLTypes["Date"] | undefined
};
	["ProjectOps"]: {
	__typename: "ProjectOps",
	archive?: boolean | undefined,
	remove?: boolean | undefined,
	unArchive?: boolean | undefined,
	update?: boolean | undefined
};
	["GenerateOAuthTokenInput"]: {
		code: string,
	social: GraphQLTypes["SocialKind"]
};
	["ProjectUpdate"]: {
		client?: string | undefined,
	name?: string | undefined
};
	["PublicMutation"]: {
	__typename: "PublicMutation",
	changePassword: boolean,
	generateOAuthToken: boolean,
	integrateSocialAccount: boolean,
	registerAccount?: boolean | undefined,
	registerUserAccount: boolean,
	verifyEmail: boolean
};
	["Query"]: {
	__typename: "Query",
	admin?: GraphQLTypes["AdminQuery"] | undefined,
	public?: GraphQLTypes["PublicQuery"] | undefined,
	user?: GraphQLTypes["UserQuery"] | undefined
};
	/** Stripe subscription with it's fields */
["Subscription"]: {
	__typename: "Subscription",
	_id: string,
	amount: number,
	billingPeriodEnds: number,
	cancelAtPeriodEnd: boolean,
	canceledAt?: number | undefined,
	currency: string,
	customerId: string,
	name: string,
	productId: string,
	scubscriptionId: string,
	status: string,
	username: string
};
	/** bi */
["Billing"]: {
	__typename:"FixedBilling" | "HourlyBilling",
	value: number,
	currency: GraphQLTypes["Currency"],
	/** Admin object with a name to identify administrator of all objects. Admin is an primary owner of the account */
	account: GraphQLTypes["Account"],
	project?: GraphQLTypes["Project"] | undefined
	['...on FixedBilling']: '__union' & GraphQLTypes["FixedBilling"];
	['...on HourlyBilling']: '__union' & GraphQLTypes["HourlyBilling"];
};
	["ClientUpdate"]: {
		name?: string | undefined,
	projects?: Array<string> | undefined
};
	["CreateFixedBilling"]: {
		value: number,
	currency: GraphQLTypes["Currency"],
	project: string
};
	["Archivable"]: {
	__typename:"Client" | "Project",
	archivedAt?: GraphQLTypes["DateTime"] | undefined
	['...on Client']: '__union' & GraphQLTypes["Client"];
	['...on Project']: '__union' & GraphQLTypes["Project"];
};
	["SimpleUserInput"]: {
		password: string,
	username: string
}
    }
export const enum SocialKind {
	Google = "Google",
	Github = "Github",
	Apple = "Apple"
}
/** # Roles
- Employee doesn't have role
- Owner is the person who created the account
- Admin is the person given admin rights by owner */
export const enum Role {
	OWNER = "OWNER",
	ADMIN = "ADMIN"
}
export const enum Currency {
	PLN = "PLN",
	EUR = "EUR",
	USD = "USD"
}
export const enum LoginType {
	GoogleOAuth = "GoogleOAuth",
	Github = "Github",
	Apple = "Apple",
	Default = "Default"
}

type ZEUS_VARIABLES = {
	["LoginInput"]: ValueTypes["LoginInput"];
	["DateTime"]: ValueTypes["DateTime"];
	["CreateClient"]: ValueTypes["CreateClient"];
	["ChangePasswordInput"]: ValueTypes["ChangePasswordInput"];
	["SocialKind"]: ValueTypes["SocialKind"];
	["UpgradeAdminAccountInput"]: ValueTypes["UpgradeAdminAccountInput"];
	["CreateLog"]: ValueTypes["CreateLog"];
	["UpdateFixedBilling"]: ValueTypes["UpdateFixedBilling"];
	["RegisterAccount"]: ValueTypes["RegisterAccount"];
	["Time"]: ValueTypes["Time"];
	["UpdateHourlyBilling"]: ValueTypes["UpdateHourlyBilling"];
	["InviteTokenInput"]: ValueTypes["InviteTokenInput"];
	["Role"]: ValueTypes["Role"];
	["Date"]: ValueTypes["Date"];
	["CreateVacation"]: ValueTypes["CreateVacation"];
	["UpdateUserAccount"]: ValueTypes["UpdateUserAccount"];
	["VerifyEmailInput"]: ValueTypes["VerifyEmailInput"];
	["Currency"]: ValueTypes["Currency"];
	["DateFilter"]: ValueTypes["DateFilter"];
	["AdminFilter"]: ValueTypes["AdminFilter"];
	["CreateProject"]: ValueTypes["CreateProject"];
	["CreateHourlyBilling"]: ValueTypes["CreateHourlyBilling"];
	["LoginType"]: ValueTypes["LoginType"];
	["RegisterUserAccount"]: ValueTypes["RegisterUserAccount"];
	["UpdateLog"]: ValueTypes["UpdateLog"];
	["GenerateOAuthTokenInput"]: ValueTypes["GenerateOAuthTokenInput"];
	["ProjectUpdate"]: ValueTypes["ProjectUpdate"];
	["ClientUpdate"]: ValueTypes["ClientUpdate"];
	["CreateFixedBilling"]: ValueTypes["CreateFixedBilling"];
	["SimpleUserInput"]: ValueTypes["SimpleUserInput"];
}