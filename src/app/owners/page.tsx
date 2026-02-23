import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function OwnersPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
      <div className="flex items-center">
        <h1 className="font-headline text-lg font-semibold md:text-2xl">
          Owners
        </h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Owners</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}
