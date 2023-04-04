import { getErrorMessage } from '@/api';

export const createError = (error: any): Error => {
    const msg = getErrorMessage(error);
    const [stack, ...message] = msg.split(' ');
    return {
        message: message.join(' '),
        name: 'GraphQL Error',
        stack,
    };
};
