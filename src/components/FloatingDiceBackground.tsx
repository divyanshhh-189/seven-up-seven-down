const floatingDice = ["one", "two", "three", "four"] as const;

export default function FloatingDiceBackground() {
  return (
    <div className="game-dice-background" aria-hidden="true">
      {floatingDice.map((die) => (
        <span
          key={die}
          className={`game-dice-background__die game-dice-background__die--${die}`}
        >
          <span className="game-dice-background__face game-dice-background__face--front" />
          <span className="game-dice-background__face game-dice-background__face--right" />
          <span className="game-dice-background__face game-dice-background__face--top" />
        </span>
      ))}
    </div>
  );
}
