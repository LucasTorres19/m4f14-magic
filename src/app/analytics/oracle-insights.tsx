import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function OracleInsights() {
  return (
    <Card className="border-primary/40 bg-card/80 shadow-xl backdrop-blur">
      <CardHeader>
        <CardTitle className="text-foreground text-lg font-semibold tracking-wide">
          Focos del oráculo
        </CardTitle>
        <CardDescription>
          Los indicadores clave de la semana mágica.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 sm:px-6">
        <ul className="text-muted-foreground space-y-4 text-sm leading-relaxed text-center sm:text-left">
          <li>
            <span className="text-foreground font-semibold">4&nbsp;</span>
            duelos trazados desde el último amanecer.
          </li>
          <li>
            <span className="text-foreground font-semibold">5&nbsp;</span>
            invocadores consultaron el oráculo esta semana.
          </li>
        </ul>
      </CardContent>
    </Card>
  );
}
