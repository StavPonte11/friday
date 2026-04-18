import { redirect } from "next/navigation";

export default async function DocsRootPage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  redirect(`/${params.locale}/docs/overview`);
}
