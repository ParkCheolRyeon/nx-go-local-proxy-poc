import { cva } from 'class-variance-authority';
import { ButtonHTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';

import { cn } from '@/lib/utils';

export type IProps = {
  variant?: 'contained' | 'outlined';
  color?: 'blue' | 'yellow' | 'green' | 'white';
  disabled?: boolean;
  className?: string;
  size?: 'xsmall' | 'large';
} & ButtonHTMLAttributes<HTMLButtonElement>;

const sizes = {
  xsmall: 'text-base h-[36px] rounded-[8px] px-[15px] py-[5px]',
  large: 'text-[22px] leading-7 h-[52px] rounded-[12px] px-[15px] py-[11px]',
};

const variants = cva(undefined, {
  variants: {
    variant: {
      outlined: 'font-bold',
      contained: 'font-extrabold',
      // ghost: ""
    },
    color: {
      blue: '',
      yellow: '',
      white: '',
      green: '',
    },
    size: {
      xsmall: '',
      // small: "",
      large: '',
    },
    disabled: {
      true: 'disabled:border disabled:border-gray-300 disabled:bg-gray-200 disabled:text-gray-400 disabled:font-bold',
      false: '',
    },
  },
  compoundVariants: [
    {
      variant: 'contained',
      color: 'blue',
      className: 'border border-[#3186F0] bg-[#3196FF] text-white',
    },
    {
      variant: 'contained',
      color: 'yellow',
      className: 'border border-[#FFB300] bg-[#FFC107] text-white',
    },
    {
      variant: 'contained',
      color: 'white',
      className: 'border border-[#E0E0E0] bg-[#FFFFFF] text-[#616161]',
    },
    {
      variant: 'contained',
      color: 'green',
      className: 'border border-[#81C784] bg-[#C8E6C9] text-[#66BB6A]',
    },
    {
      variant: 'outlined',
      color: 'blue',
      className: 'border border-[#3186F0] bg-white text-[#3186F0]',
    },
    {
      variant: 'outlined',
      color: 'yellow',
      className: 'border border-[#FFB300] bg-white text-[#FFB300]',
    },

    {
      variant: 'outlined',
      disabled: true,
      className: twMerge('disabled:bg-transparent disabled:border-line-01'),
    },
    {
      variant: ['contained'],
      color: 'white',
      className: twMerge('font-bold'),
    },
  ],
});

export default function Button(props: IProps) {
  const { variant = 'contained', color = 'blue', disabled, className, children, size = 'xsmall', ...restProps } = props;

  return (
    <button
      className={cn('min-w-[100px]', sizes[size], variants({ variant, color, size, disabled }), className)}
      disabled={disabled}
      {...restProps}
    >
      {children}
    </button>
  );
}
