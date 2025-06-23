import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface ProgressCardProps {
  title: string;
  value: number;
  max: number;
  description?: string;
  className?: string;
  progressColor?: string;
}

export function ProgressCard({
  title,
  value,
  max,
  description,
  className,
  progressColor = "bg-primary",
}: ProgressCardProps) {
  const percentage = Math.round((value / max) * 100);
  
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-2">
          <div className="text-2xl font-bold">{percentage}%</div>
          <div className="text-sm text-muted-foreground">
            {value} of {max}
          </div>
        </div>
        <Progress 
          value={percentage} 
          className="h-2" 
          indicatorClassName={progressColor} 
        />
        {description && (
          <p className="text-xs text-muted-foreground mt-2">{description}</p>
        )}
      </CardContent>
    </Card>
  );
} 