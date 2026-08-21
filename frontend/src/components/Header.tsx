interface HeaderProps {
  onReset: () => void;
}

/** Top application bar: product name, subtitle, and the room reset action. */
export function Header({ onReset }: HeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-neutral-800 px-6 py-4">
      <div>
        <h1 className="text-base font-semibold tracking-tight text-neutral-100">RoomTune</h1>
        <p className="text-xs text-neutral-500">Room Acoustics Simulator</p>
      </div>
      <button
        type="button"
        onClick={onReset}
        className="rounded-md border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 transition-colors hover:border-neutral-500 hover:text-neutral-100"
      >
        Reset Room
      </button>
    </header>
  );
}
