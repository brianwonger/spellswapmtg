import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

export default function EmailConfirmedPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Email Confirmed!</CardTitle>
          <CardDescription>
            Thank you for confirming your email address.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p>You can now log in to your account.</p>
        </CardContent>
        <div className="p-6 pt-0">
          <Link href="/login" passHref>
            <Button className="w-full">Go to Login</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
} 