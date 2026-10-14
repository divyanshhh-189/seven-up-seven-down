const floatingDice = ["one", "two", "three", "four"] as const;
const cubeFaces = ["front", "back", "right", "left", "top", "bottom"] as const;

export default function FloatingDiceBackground() {
  return (
    <div className="game-dice-background" aria-hidden="true">
      {floatingDice.map((die) => (
        <span
          key={die}
          className={"game-dice-background__die game-dice-background__die--" + die}
        >
          {cubeFaces.map((face) => (
            <span
              key={face}
              className={"game-dice-background__face game-dice-background__face--" + face}
            />
          ))}
        </span>
      ))}
    </div>
  );
}
