import Link from "next/link"
import { MDXRemote } from "next-mdx-remote/rsc"

const components = {
  h2: (props: React.ComponentProps<"h2">) => <h2 className="mt-10 font-display text-2xl font-semibold tracking-tight" {...props} />,
  h3: (props: React.ComponentProps<"h3">) => <h3 className="mt-8 font-display text-lg font-semibold" {...props} />,
  p: (props: React.ComponentProps<"p">) => <p className="mt-4 leading-relaxed text-text-mid" {...props} />,
  blockquote: (props: React.ComponentProps<"blockquote">) => <blockquote className="mt-5 border-l-2 border-brass bg-surface-2 px-5 py-3 text-sm leading-6 text-text-mid" {...props} />,
  ul: (props: React.ComponentProps<"ul">) => <ul className="mt-4 list-disc space-y-2 pl-6 text-text-mid marker:text-signal" {...props} />,
  ol: (props: React.ComponentProps<"ol">) => <ol className="mt-4 list-decimal space-y-2 pl-6 text-text-mid marker:text-text-low" {...props} />,
  li: (props: React.ComponentProps<"li">) => <li className="pl-1 leading-relaxed" {...props} />,
  a: ({ href = "", ...rest }: React.ComponentProps<"a">) => <Link href={href} className="text-signal underline decoration-signal/30 underline-offset-4 hover:decoration-signal" {...rest} />,
  strong: (props: React.ComponentProps<"strong">) => <strong className="font-semibold text-foreground" {...props} />,
  hr: () => <hr className="my-10 border-hairline" />,
}

export function ArticleBody({ source }: { source: string }) {
  return <MDXRemote source={source} components={components} />
}

