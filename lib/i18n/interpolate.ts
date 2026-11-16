export function interpolate(message: string, values: Record<string, string | number>): string {
  return message.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? `{${key}}`))
}
