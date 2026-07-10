import { cookies } from "next/headers";
import { CarGallery } from "@/components/CarGallery";
import { PasswordGate } from "@/components/PasswordGate";

export default function Home() {
  const session = cookies().get("autovault_session");

  if (!session || (session.value !== "gallery" && session.value !== "full")) {
    return <PasswordGate />;
  }

  return <CarGallery />;
}
