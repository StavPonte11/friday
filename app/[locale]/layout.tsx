import React from 'react';
import '../globals.css';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { AppProviders } from '@/components/providers/app-providers';
import { CommandPalette } from '@/components/shell/CommandPalette';

export const metadata = {
  title: 'Friday - Engineering Portal',
  description: 'Internal developer and product portal',
};

export default async function LocaleLayout(props: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const params = await props.params;
  const { locale } = params;
  const { children } = props;
  const messages = await getMessages();
  const dir = locale === 'he' ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir} className="dark" suppressHydrationWarning>
      <body className="font-sans antialiased bg-background text-foreground min-h-screen">
        <NextIntlClientProvider messages={messages}>
          <AppProviders>
            {children}
            <CommandPalette />
          </AppProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
