type DiceProps = {
  value: number;
  rolling?: boolean;
};

const pipPositions: Record<number, string[]> = {
  1: ["center"],
  2: ["top-left", "bottom-right"],
  3: ["top-left", "center", "bottom-right"],
  4: [
    "top-left",
    "top-right",
    "bottom-left",
    "bottom-right",
  ],
  5: [
    "top-left",
    "top-right",
    "center",
    "bottom-left",
    "bottom-right",
  ],
  6: [
    "top-left",
    "top-right",
    "middle-left",
    "middle-right",
    "bottom-left",
    "bottom-right",
  ],
};

export default function Dice({
  value,
  rolling = false,
}: DiceProps) {
  const positions = pipPositions[value] ?? pipPositions[1];

  return (
    <div
      className={`dice-container ${
        rolling ? "dice-rolling" : ""
      }`}
      aria-label={`Dice showing ${value}`}
    >
      {positions.map((position, index) => (
        <span
          key={index}
          className={`dice-pip ${position}`}
        />
      ))}
    </div>
  );
}