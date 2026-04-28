import path from "path";
import fs from "fs/promises";
import { compileMDX } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import { DocsCallout } from "@/components/docs/DocsCallout";
import { DocsCopyCode } from "@/components/docs/DocsCopyCode";

const CONTENT_DIR = path.join(process.cwd(), "docs-content");

export async function getDocPage(slug: string) {
  const filePath = path.join(CONTENT_DIR, `${slug}.mdx`);
  const raw = await fs.readFile(filePath, "utf-8");
  
  const { content, frontmatter } = await compileMDX<{ title: string; description?: string }>({
    source: raw,
    options: { 
      parseFrontmatter: true,
      mdxOptions: {
        remarkPlugins: [remarkGfm],
      }
    },
    components: {
      Callout: DocsCallout,
      pre: DocsCopyCode,
    }
  });

  return { content, frontmatter };
}
