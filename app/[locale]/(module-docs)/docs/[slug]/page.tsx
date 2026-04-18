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
    <article className="max-w-4xl mx-auto px-6 py-12 lg:px-12 lg:py-16">
      {/* Page header */}
      <div className="mb-12 pb-8 border-b border-border/40">
        <h1 className="text-4xl lg:text-5xl font-black tracking-tight text-foreground bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
          {frontmatter.title}
        </h1>
        {frontmatter.description && (
          <p className="mt-4 text-lg lg:text-xl text-muted-foreground leading-relaxed max-w-2xl font-medium">
            {frontmatter.description}
          </p>
        )}
      </div>

      {/* MDX content wrapper */}
      <div className="prose prose-invert prose-base lg:prose-lg max-w-none
        prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-foreground
        prose-h2:text-2xl lg:prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-6 prose-h2:pb-2 prose-h2:border-b prose-h2:border-border/30
        prose-h3:text-xl lg:prose-h3:text-2xl prose-h3:mt-8 prose-h3:mb-4
        prose-p:leading-loose prose-p:text-muted-foreground/90
        prose-li:text-muted-foreground/90 prose-li:leading-relaxed
        prose-a:text-primary prose-a:no-underline hover:prose-a:underline hover:prose-a:text-primary/80 prose-a:font-medium
        prose-strong:text-foreground prose-strong:font-semibold
        prose-code:text-primary-foreground prose-code:bg-primary/20 prose-code:px-2 prose-code:py-0.5 prose-code:rounded-md prose-code:text-sm prose-code:font-mono prose-code:font-medium
        prose-hr:border-border/50 prose-hr:my-10
      ">
        {content}
      </div>

      {/* Page feedback */}
      <DocsPageFeedback page={slug} />
    </article>
  );
}
