export default function Seal({ label = 'UC', size = 44 }) {
  return (
    <div
      className="relative flex items-center justify-center rounded-full border-2 border-brass text-brass font-display font-semibold select-none"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      <div className="absolute inset-[3px] rounded-full border border-brass/40" />
      {label}
    </div>
  );
}
