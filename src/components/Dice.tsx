type DiceProps = {
  value: number;
  rolling?: boolean;
};

const pipPositions: Record<number, string[]> = {
  1: ["center"],
  2: ["top-left", "bottom-right"],
  3: ["top-left", "center", "bottom-right"],
  4: ["top-left", "top-right", "bottom-left", "bottom-right"],
  5: ["top-left", "top-right", "center", "bottom-left", "bottom-right"],
  6: [
    "top-left",
    "top-right",
    "middle-left",
    "middle-right",
    "bottom-left",
    "bottom-right",
  ],
};

const diceFaces = [1, 2, 3, 4, 5, 6] as const;
const faceDirections: Record<(typeof diceFaces)[number], string> = {
  1: "front",
  2: "top",
  3: "right",
  4: "left",
  5: "bottom",
  6: "back",
};

export default function Dice({ value, rolling = false }: DiceProps) {
  const visibleValue = pipPositions[value] ? value : 1;

  return (
    <div
      className={`dice-container${rolling ? " dice-rolling" : ""}`}
      role="img"
      aria-label={`Die showing ${visibleValue}`}
    >
      <div
        className={`dice-cube dice-cube--face-${visibleValue}${rolling ? " dice-cube--throwing" : ""}`}
        aria-hidden="true"
      >
        {diceFaces.map((faceValue) => (
          <div
            key={faceValue}
            className={`dice-face dice-face--${faceDirections[faceValue]}`}
          >
            {pipPositions[faceValue].map((position, index) => (
              <span key={index} className={`dice-pip ${position}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
