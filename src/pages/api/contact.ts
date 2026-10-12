import { createFormEndpoint, methodNotAllowed } from '../../lib/api';

export const prerender = false;

export const POST = createFormEndpoint('contact');
export const GET = methodNotAllowed;
