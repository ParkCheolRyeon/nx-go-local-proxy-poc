'use client';

import { type ComponentType } from 'react';

import useDialogStore from '@/stores/dialogStore';

type AnyDialogProps = { resolve: (value: unknown) => void } & Record<string, unknown>;

export default function DialogRenderer() {
  const dialogMap = useDialogStore((s) => s.dialogMap);
  const remove = useDialogStore((s) => s.remove);

  const entries = Object.entries(dialogMap);
  if (entries.length === 0) return null;

  return (
    <>
      {entries.map(([key, dialog]) => {
        const Component = dialog.component as ComponentType<AnyDialogProps>;
        const props = (dialog.props ?? {}) as Record<string, unknown>;
        return (
          <Component
            key={key}
            {...props}
            resolve={(value: unknown) => {
              dialog.onResolve?.(value);
              remove(key);
            }}
          />
        );
      })}
    </>
  );
}
