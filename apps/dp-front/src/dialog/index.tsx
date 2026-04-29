import { type ComponentProps, type ComponentType } from 'react';

import AlertModal, { type AlertTone } from '@/components/dialog/AlertModal';
import ConfirmModal, { type ConfirmTone } from '@/components/dialog/ConfirmModal';
import useDialogStore, { type DialogRequestComponentProps } from '@/stores/dialogStore';

type AlertOption = {
  title?: string;
  tone?: AlertTone;
  okButtonText?: string;
};

type ConfirmOption = {
  title?: string;
  tone?: ConfirmTone;
  destructive?: boolean;
  yesButtonText?: string;
  noButtonText?: string;
  allowClose?: boolean;
};

export function openDialog<
  C extends ComponentType<any>,
  T extends ComponentProps<C> extends DialogRequestComponentProps<infer R> ? R : never,
>(component: C, props?: Omit<ComponentProps<C>, 'resolve'>): Promise<T> {
  return new Promise<T>((resolve) => {
    useDialogStore.getState().add<T, ComponentProps<C>, C>({
      component,
      props,
      onResolve: (value) => {
        resolve(value);
      },
    });
  });
}

export function alert(message: string, option?: AlertOption): Promise<void> {
  return openDialog(AlertModal, { message, ...option });
}

export function confirm(message: string, option?: ConfirmOption): Promise<boolean | undefined> {
  return openDialog(ConfirmModal, { message, ...option });
}
