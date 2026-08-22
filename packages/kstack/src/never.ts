export function assertNever(value: never, message?: string): never {
  throw new Error(message ?? `unhandled value: ${JSON.stringify(value)}`);
}
