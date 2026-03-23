import { ReferenceLine } from 'recharts';

function DeathLabel({ name, age, color, viewBox }) {
  const { x, y } = viewBox;
  return (
    <g>
      <text x={x - 4} y={y + 12} textAnchor="end"   fontSize={10} fill={color}>{name} Dies</text>
      <text x={x + 4} y={y + 12} textAnchor="start" fontSize={10} fill={color}>Age {age}</text>
    </g>
  );
}

export function DeathReferenceLine({ x, name, age, color }) {
  return (
    <ReferenceLine
      x={x}
      stroke={color}
      strokeDasharray="4 3"
      label={(props) => <DeathLabel name={name} age={age} color={color} {...props} />}
    />
  );
}
