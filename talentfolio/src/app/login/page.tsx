import { Suspense } from "react";
import { LoginDoors } from "@/components/login/LoginDoors";

export const metadata = { title: "로그인 · TalentFolio" };

export default function LoginPage() {
  return (
    <Suspense>
      <LoginDoors />
    </Suspense>
  );
}
