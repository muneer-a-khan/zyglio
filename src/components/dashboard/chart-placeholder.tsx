import { BarChart, LineChart } from "lucide-react";

interface ChartPlaceholderProps {
  height?: number;
  type?: "bar" | "line";
}

export function ChartPlaceholder({ 
  height = 200, 
  type = "bar" 
}: ChartPlaceholderProps) {
  // Generate random data for the charts
  const generateData = (points: number) => {
    return Array.from({ length: points }, () => Math.floor(Math.random() * 80) + 20);
  };
  
  const barData = generateData(7);
  const lineData = generateData(12);
  
  // Calculate dimensions
  const chartWidth = 100;
  const maxValue = 100;
  
  if (type === "bar") {
    return (
      <div 
        className="relative bg-muted/10 rounded-md border border-dashed p-4"
        style={{ height: `${height}px` }}
      >
        <div className="absolute top-2 left-2 text-xs text-muted-foreground">Sample data visualization</div>
        <div className="flex items-end justify-between h-full pt-6 pb-4 px-4">
          {barData.map((value, index) => (
            <div key={index} className="flex flex-col items-center">
              <div 
                className="bg-primary/80 rounded-t-sm w-8"
                style={{ 
                  height: `${(value / maxValue) * (height - 50)}px`,
                }}
              ></div>
              <div className="text-xs text-muted-foreground mt-1">{`D${index + 1}`}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div 
      className="relative bg-muted/10 rounded-md border border-dashed p-4"
      style={{ height: `${height}px` }}
    >
      <div className="absolute top-2 left-2 text-xs text-muted-foreground">Sample data visualization</div>
      <div className="h-full pt-6 pb-4 px-4">
        <svg 
          width="100%" 
          height="100%" 
          viewBox={`0 0 ${lineData.length * 20} 100`}
          preserveAspectRatio="none"
        >
          <polyline
            points={lineData.map((value, i) => `${i * 20}, ${100 - value}`).join(' ')}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="2"
          />
          {lineData.map((value, i) => (
            <circle 
              key={i}
              cx={i * 20} 
              cy={100 - value} 
              r="3" 
              fill="hsl(var(--primary))" 
            />
          ))}
        </svg>
        <div className="flex justify-between mt-2">
          {[0, 3, 6, 9, 11].map((month) => (
            <div key={month} className="text-xs text-muted-foreground">{`M${month + 1}`}</div>
          ))}
        </div>
      </div>
    </div>
  );
} 