import type { PropsWithChildren } from 'react';

import './BaseLayout.scss';

type BaseLayoutProps = PropsWithChildren;

export function BaseLayout({ children }: Readonly<BaseLayoutProps>) {
  return (
    <div className="base-layout">
      <main className="base-layout__content">{children}</main>
    </div>
  );
}
