import { Children, isValidElement, type ReactNode } from "react"
import Link from "next/link"
import { MDXRemote } from "next-mdx-remote/rsc"
import remarkGfm from "remark-gfm"

function textContent(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node)
  if (Array.isArray(node)) return node.map(textContent).join("")
  if (isValidElement<{ children?: ReactNode }>(node)) return textContent(node.props.children)
  return ""
}

function SmartUnorderedList({ children, ...props }: React.ComponentProps<"ul">) {
  const items = Children.toArray(children)
  const isChecklist = items.length >= 2 && items.every((item) => textContent(item).trim().length <= 160)
  if (!isChecklist) {
    return (
      <ul
        className="my-5 list-disc space-y-2.5 pl-6 text-[16.5px] leading-[1.6] text-[#2A3550] marker:text-[#D3B36B] [&_p]:m-0"
        {...props}
      >
        {children}
      </ul>
    )
  }
  return (
    <ul
      className="my-5 grid list-none gap-2.5 p-0 [&_p]:m-0 [&>li]:grid [&>li]:grid-cols-[24px_minmax(0,1fr)] [&>li]:items-start [&>li]:gap-3 [&>li]:rounded-xl [&>li]:border [&>li]:border-[rgba(20,37,74,.13)] [&>li]:bg-white [&>li]:px-4 [&>li]:py-3.5 [&>li]:text-[16.5px] [&>li]:leading-[1.5] [&>li]:text-[#2A3550] [&>li]:before:mt-px [&>li]:before:grid [&>li]:before:size-6 [&>li]:before:place-items-center [&>li]:before:rounded-[7px] [&>li]:before:bg-[#14254A] [&>li]:before:text-[12px] [&>li]:before:font-extrabold [&>li]:before:text-[#D3B36B] [&>li]:before:content-['✓'] [&>li>p>strong:first-child]:block [&>li>p>strong:first-child]:text-[#14254A]"
      {...props}
    >
      {children}
    </ul>
  )
}

function StepList({ children, ...props }: React.ComponentProps<"ol">) {
  return (
    <ol
      className="my-5 list-none p-0 [counter-reset:step] [&_p]:m-0 [&>li]:grid [&>li]:grid-cols-[44px_minmax(0,1fr)] [&>li]:gap-3.5 [&>li]:border-t [&>li]:border-[rgba(20,37,74,.13)] [&>li]:py-4 [&>li]:text-[17px] [&>li]:leading-[1.55] [&>li]:text-[#2A3550] [&>li]:[counter-increment:step] [&>li]:before:pt-[3px] [&>li]:before:font-mono [&>li]:before:text-[14px] [&>li]:before:font-semibold [&>li]:before:text-[#8E6F2E] [&>li]:before:content-[counter(step,decimal-leading-zero)] [&>li:last-child]:border-b [&>li>p>strong:first-child]:block [&>li>p>strong:first-child]:text-[#14254A]"
      {...props}
    >
      {children}
    </ol>
  )
}

function Note({ children }: React.ComponentProps<"blockquote">) {
  const text = textContent(children).trim()
  const labeled = text.match(/^([^:\n]{2,48}):\s+([\s\S]+)$/)
  return (
    <aside className="my-6 grid grid-cols-[36px_minmax(0,1fr)] gap-3.5 rounded-[14px] border border-[rgba(20,37,74,.13)] bg-[#F7F4EE] px-[22px] py-5 text-[16.5px] leading-[1.6] text-[#2A3550]">
      <span aria-hidden className="grid size-9 place-items-center rounded-full bg-[#14254A] font-[family-name:var(--font-title)] text-[15px] font-bold not-italic text-[#D3B36B]">i</span>
      <div>
        <p className="mb-1 font-mono text-[13px] font-semibold uppercase tracking-[.08em] text-[#8E6F2E]">
          {labeled?.[1] ?? "Note"}
        </p>
        {labeled ? <p className="m-0">{labeled[2]}</p> : <div className="[&_p]:m-0">{children}</div>}
      </div>
    </aside>
  )
}

function ArticleLink({ href = "", children, ...props }: React.ComponentProps<"a">) {
  const className = "font-semibold text-[#14254A] underline decoration-2 decoration-[#D3B36B] underline-offset-4 transition-colors hover:text-[#8E6F2E] focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14254A]/35"
  if (href.startsWith("/")) return <Link href={href} className={className}>{children}</Link>
  if (/^https?:\/\//i.test(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className} {...props}>
        {children}<span aria-hidden className="ml-1 text-[.8em] text-[#8E6F2E]">↗</span>
      </a>
    )
  }
  return <a href={href} className={className} {...props}>{children}</a>
}

const components = {
  h2: (props: React.ComponentProps<"h2">) => <h2 className="mb-3.5 mt-14 scroll-mt-[90px] font-[family-name:var(--font-title)] text-[26px] font-medium not-italic leading-[1.15] tracking-[-.015em] text-[#14254A] min-[760px]:text-[32px]" {...props} />,
  h3: (props: React.ComponentProps<"h3">) => <h3 className="mb-2 mt-7 font-[family-name:var(--font-title)] text-[19px] font-semibold not-italic text-[#14254A]" {...props} />,
  p: (props: React.ComponentProps<"p">) => <p className="mb-[18px] mt-0" {...props} />,
  blockquote: Note,
  ul: SmartUnorderedList,
  ol: StepList,
  li: (props: React.ComponentProps<"li">) => <li {...props} />,
  a: ArticleLink,
  strong: (props: React.ComponentProps<"strong">) => <strong className="font-semibold text-[#14254A]" {...props} />,
  hr: () => <hr className="my-10 border-0 border-t border-[rgba(20,37,74,.13)]" />,
  table: (props: React.ComponentProps<"table">) => <div className="my-6 max-w-full overflow-x-auto rounded-xl border border-[rgba(20,37,74,.13)]"><table className="w-full min-w-[560px] border-collapse text-left text-[15px]" {...props} /></div>,
  thead: (props: React.ComponentProps<"thead">) => <thead className="bg-[#F7F4EE] font-mono text-[12px] uppercase tracking-[.06em] text-[#14254A]" {...props} />,
  th: (props: React.ComponentProps<"th">) => <th className="border-b border-r border-[rgba(20,37,74,.13)] px-4 py-3 font-semibold last:border-r-0" {...props} />,
  td: (props: React.ComponentProps<"td">) => <td className="border-b border-r border-[rgba(20,37,74,.13)] px-4 py-3 align-top last:border-r-0" {...props} />,
  tr: (props: React.ComponentProps<"tr">) => <tr className="last:[&>td]:border-b-0" {...props} />,
}

export function ArticleBody({ source, inverted = false }: { source: string; inverted?: boolean }) {
  if (!source.trim()) return null
  return (
    <div className={`text-[17px] leading-[1.72] min-[760px]:text-[18px] ${inverted ? "text-[#DDE3F0]" : "text-[#2A3550]"}`}>
      <MDXRemote source={source} components={components} options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }} />
    </div>
  )
}
