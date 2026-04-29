'use client';

type ToggleProps = {
  on: boolean;
  onClick: () => void;
};

export default function Toggle({ on, onClick }: ToggleProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className="relative h-6 w-[42px] flex-none cursor-pointer rounded-full border-0"
      style={{
        background: on ? 'linear-gradient(135deg,#3196ff,#1C7AE0)' : 'rgba(28,122,224,0.16)',
        boxShadow: on ? '0 4px 10px rgba(28,122,224,0.28)' : 'inset 0 1px 2px rgba(28,122,224,0.1)',
        transition: 'background .25s, box-shadow .25s',
      }}
    >
      <span
        className="absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white"
        style={{
          left: on ? 21 : 3,
          boxShadow: '0 2px 6px rgba(11,42,99,0.22)',
          transition: 'left .25s cubic-bezier(.34,1.56,.64,1)',
        }}
      />
    </button>
  );
}
