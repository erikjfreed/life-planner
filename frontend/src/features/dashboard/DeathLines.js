import { ReferenceLine } from 'recharts';

function BgText({ x, y, anchor, color, children }) {
  const w = String(children).length * 6 + 6;
  const rx = anchor === 'end' ? x - w : x;
  return (
    <g>
      <rect x={rx} y={y - 11} width={w} height={14} fill="white" fillOpacity={0.85} rx={2} />
      <text x={x} y={y} textAnchor={anchor} fontSize={10} fill={color}>{children}</text>
    </g>
  );
}

function DeathLabel({ name, age, color, viewBox }) {
  const { x, y } = viewBox;
  return (
    <g>
      <BgText x={x - 4} y={y + 12} anchor="end"   color={color}>{name}</BgText>
      <BgText x={x + 4} y={y + 12} anchor="start" color={color}>Dies</BgText>
      <BgText x={x - 4} y={y + 24} anchor="end"   color={color}>Age</BgText>
      <BgText x={x + 4} y={y + 24} anchor="start" color={color}>{age}</BgText>
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
