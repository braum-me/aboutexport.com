import { createFormEndpoint, methodNotAllowed } from '../../lib/api';

export const prerender = false;

export const POST = createFormEndpoint('waitlist');
export const GET = methodNotAllowed;
