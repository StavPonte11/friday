import { redirect } from "next/navigation";

export default async function PmIndexPage(props: { params: Promise<{ locale: string }> }) {
    const { locale } = await props.params;
    redirect(`/${locale}/pm/projects`);
}
