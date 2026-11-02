import { Suspense } from "react";
import { SignupDoors } from "@/components/login/SignupDoors";

export default function SignupPage() {
  return (
    <Suspense>
      <SignupDoors />
    </Suspense>
  );
}
