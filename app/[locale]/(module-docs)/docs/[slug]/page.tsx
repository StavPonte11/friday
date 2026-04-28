import { use } from "react";
import { notFound } from "next/navigation";
import { getDocPage } from "@/lib/docs/mdx";
import { DocsPageFeedback } from "@/components/docs/DocsPageFeedback";

export default async function DocPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;

  let content;
  let frontmatter: { title: string; description?: string };
  try {
    ({ content, frontmatter } = await getDocPage(slug));
  } catch (error) {
    console.error("Error loading document:", error);
    notFound();
  }

  return (
    <article className="max-w-3xl mx-auto px-8 py-14 lg:px-12 lg:py-20">
      {/* Page header */}
      <div className="mb-14">
        <div className="flex items-center gap-2 mb-6">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary/70">
            Documentation
          </span>
        </div>
        <h1 className="text-[2.5rem] lg:text-[3rem] font-bold tracking-tight text-foreground leading-[1.1] mb-5">
          {frontmatter.title}
        </h1>
        {frontmatter.description && (
          <p className="text-lg text-muted-foreground leading-relaxed">
            {frontmatter.description}
          </p>
        )}
        <div className="mt-8 h-px bg-border/40" />
      </div>

      {/* MDX content */}
      <div className="prose prose-invert max-w-none
        prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-foreground
        prose-h2:text-[1.6rem] prose-h2:mt-16 prose-h2:mb-5
        prose-h3:text-[1.25rem] prose-h3:mt-10 prose-h3:mb-3 prose-h3:text-foreground/90
        prose-h4:text-base prose-h4:mt-6 prose-h4:mb-2 prose-h4:uppercase prose-h4:tracking-wide prose-h4:text-muted-foreground
        prose-p:text-[1rem] prose-p:leading-[1.85] prose-p:text-muted-foreground prose-p:my-4
        prose-li:text-[1rem] prose-li:leading-[1.8] prose-li:text-muted-foreground
        prose-ul:my-5 prose-ol:my-5 prose-li:my-1
        prose-a:text-foreground prose-a:font-medium prose-a:underline prose-a:underline-offset-4 prose-a:decoration-border/60
        hover:prose-a:text-primary hover:prose-a:decoration-primary/60 prose-a:transition-colors
        prose-strong:text-foreground prose-strong:font-semibold
        prose-code:font-mono prose-code:text-[0.85em] prose-code:text-foreground prose-code:bg-muted/50 
        prose-code:border prose-code:border-border/60 prose-code:rounded-md prose-code:px-[0.4em] prose-code:py-[0.15em]
        prose-code:before:content-none prose-code:after:content-none
        prose-pre:bg-muted/30 prose-pre:border prose-pre:border-border/50 prose-pre:rounded-xl prose-pre:text-sm prose-pre:overflow-x-auto
        prose-blockquote:border-l-2 prose-blockquote:border-primary/40 prose-blockquote:pl-5 prose-blockquote:text-muted-foreground prose-blockquote:not-italic
        prose-hr:border-border/30 prose-hr:my-12
        prose-table:text-sm prose-table:w-full
        prose-thead:border-b prose-thead:border-border/50
        prose-th:py-3 prose-th:px-3 prose-th:text-left prose-th:text-xs prose-th:font-semibold prose-th:uppercase prose-th:tracking-wider prose-th:text-muted-foreground
        prose-td:py-3 prose-td:px-3 prose-td:text-muted-foreground prose-td:border-b prose-td:border-border/20
        prose-tr:transition-colors hover:prose-tr:bg-muted/20
      ">
        {content}
      </div>

      {/* Page feedback */}
      <div className="mt-20 pt-10 border-t border-border/30">
        <DocsPageFeedback page={slug} />
      </div>
    </article>
  );
}
