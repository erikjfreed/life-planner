import { ReferenceLine } from 'recharts';

function DeathLabel({ name, color, viewBox }) {
  const { x, y } = viewBox;
  return (
    <g>
      <text x={x - 3} y={y + 12} textAnchor="end"   fontSize={10} fill={color}>{name}</text>
      <text x={x + 3} y={y + 12} textAnchor="start" fontSize={10} fill={color}>Dies</text>
    </g>
  );
}

export function DeathReferenceLine({ x, name, color }) {
  return (
    <ReferenceLine
      x={x}
      stroke={color}
      strokeDasharray="4 3"
      label={(props) => <DeathLabel name={name} color={color} {...props} />}
    />
  );
}
