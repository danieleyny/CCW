import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { EligibilityExperience } from "@/components/marketing/eligibility-quiz";
import { getRequestBrandKey } from "@/lib/brand/server";
import { BRANDS } from "@/config/brands";

export async function generateMetadata(): Promise<Metadata> {
  const brandKey = await getRequestBrandKey();
  if (brandKey === "gln") {
    return buildMetadata({
      title: "NYC Gun License Eligibility Check",
      description:
        "Find out in two minutes whether you likely qualify for a NYC gun license. No payment, no account — just an honest read on where you stand.",
      path: "/eligibility",
    });
  }

  const brand = BRANDS.fl;
  return {
    title: `NYC Firearm License Eligibility Check · ${brand.displayName}`,
    description:
      "A short service-fit check before you create a self-guided NYC firearm-license application account.",
    robots: { index: false, follow: false },
    alternates: { canonical: `${brand.appOrigin}/eligibility` },
  };
}

export default function Eligibility() {
  return <EligibilityExperience />;
}
